import express, { json } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import fs from "fs";
import sqlite3pkg from "sqlite3";
import { ChromaClient } from "chromadb";
import { factCheckQuizQuestions } from "./src/utils/groqUtils.js";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuration ---
const AI_CONFIG = {
  useOllama: process.env.VITE_USE_OLLAMA === "true",
  ollamaBaseUrl: process.env.VITE_OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModels: {
    default: process.env.VITE_OLLAMA_MODEL_DEFAULT || "mistral",
    wordle: process.env.VITE_OLLAMA_MODEL_WORDLE || "mistral",
    quiz: process.env.VITE_OLLAMA_MODEL_QUIZ || "mistral",
    hint: process.env.VITE_OLLAMA_MODEL_HINT || "mistral",
  },
  groqApi: {
    key: process.env.VITE_GROQ_API_KEY,
    enabled: !!process.env.VITE_GROQ_API_KEY,
  },
  remoteApis: {
    huggingFace: {
      url: "https://api-inference.huggingface.co/models",
      key: process.env.VITE_HUGGING_FACE_API_KEY,
      textGenerationModel: "mistralai/Mistral-7B-Instruct-v0.1",
    },
    openRouter: {
      url: "https://openrouter.ai/api/v1",
      key: process.env.VITE_OPENROUTER_API_KEY,
      textGenerationModel: "mistralai/mistral-7b-instruct",
    },
  },
};

// --- SQLite Database Setup ---
const DB_DIR = path.join(__dirname, "database");
const DB_FILE = path.join(DB_DIR, "genai_games.sqlite");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("FATAL: Error opening database:", err.message);
    process.exit(1);
  } else {
    console.log("Connected to the SQLite database:", DB_FILE);
    db.run("PRAGMA journal_mode = WAL;", (err) => {
      if (err) console.error("Error setting WAL mode:", err.message);
      else console.log("SQLite WAL mode enabled.");
    });
    db.serialize(() => {
      console.log("Checking/Creating database tables...");
      db.run(
        `
                CREATE TABLE IF NOT EXISTS leaderboard (
                    username TEXT PRIMARY KEY NOT NULL,
                    score INTEGER DEFAULT 0 NOT NULL
                )
            `,
        (err) => {
          if (err) console.error("Error creating leaderboard table:", err);
          else console.log("Table 'leaderboard' OK.");
        }
      );

      db.run(
        `
                CREATE TABLE IF NOT EXISTS user_progress (
                    username TEXT PRIMARY KEY NOT NULL,
                    wordle_wins INTEGER DEFAULT 0 NOT NULL,
                    wordle_losses INTEGER DEFAULT 0 NOT NULL,
                    wordle_streak INTEGER DEFAULT 0 NOT NULL,
                    wordle_difficulty TEXT DEFAULT 'easy' NOT NULL,
                    wordle_completed_words TEXT DEFAULT '[]' NOT NULL, 
                    quiz_totalScore INTEGER DEFAULT 0 NOT NULL,
                    quiz_quizzesTaken INTEGER DEFAULT 0 NOT NULL,
                    quiz_avgScore REAL DEFAULT 0 NOT NULL,
                    quiz_difficulty TEXT DEFAULT 'easy' NOT NULL,
                    badges TEXT DEFAULT '[]' NOT NULL,
                    totalScore INTEGER DEFAULT 0 NOT NULL,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `,
        (err) => {
          if (err) console.error("Error creating user_progress table:", err);
          else console.log("Table 'user_progress' OK.");
        }
      );
      console.log("Database tables check complete.");
    });
  }
});

// --- Middleware ---
app.use(cors());
app.use(json());

// --- ChromaDB Integration ---
let chromaClient;
let quizCollection;
let wordleCollection;
let chromaAvailable = false;

const initializeChromaDB = async () => {
  try {
    console.log("Initializing ChromaDB client...");
    chromaClient = new ChromaClient({
      path: "http://localhost:8000",
    });

    try {
      console.log("Testing ChromaDB connection...");
      const heartbeat = await fetch("http://localhost:8000/api/v1/heartbeat", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!heartbeat.ok) {
        throw new Error(
          `ChromaDB server responded with status: ${heartbeat.status}`
        );
      }

      const response = await heartbeat.json();
      console.log("ChromaDB server is running:", response);

      console.log("Initializing ChromaDB collections...");

      try {
        quizCollection = await chromaClient.getCollection({
          name: "quiz_questions",
        });
        console.log("Found existing quiz_questions collection");
      } catch (e) {
        console.log("Creating new quiz_questions collection");
        quizCollection = await chromaClient.createCollection({
          name: "quiz_questions",
          metadata: { description: "Quiz questions and answers" },
        });
      }

      try {
        wordleCollection = await chromaClient.getCollection({
          name: "wordle_words",
        });
        console.log("Found existing wordle_words collection");
      } catch (e) {
        console.log("Creating new wordle_words collection");
        wordleCollection = await chromaClient.createCollection({
          name: "wordle_words",
          metadata: { description: "Words and hints for Wordle game" },
        });
      }

      console.log("ChromaDB collections initialized successfully");
      chromaAvailable = true;
    } catch (connectionErr) {
      console.error(
        "ChromaDB server connection failed:",
        connectionErr.message
      );
      console.warn(
        "ChromaDB is not available. Please start the ChromaDB server with 'start-chromadb.bat'"
      );
      chromaAvailable = false;
    }
  } catch (error) {
    console.error("ChromaDB initialization error:", error);
    console.warn("Vector search features will not be available");
    chromaAvailable = false;
  }
};

initializeChromaDB();

const withChromaDB = async (collectionName, operation, fallback) => {
  if (!chromaAvailable) {
    console.warn(
      `ChromaDB not available, using fallback for ${collectionName} operation`
    );
    return fallback();
  }

  try {
    const collection =
      collectionName === "quiz_questions" ? quizCollection : wordleCollection;
    if (!collection) {
      throw new Error(`Collection ${collectionName} not initialized`);
    }
    return await operation(collection);
  } catch (error) {
    console.error(
      `ChromaDB operation failed on ${collectionName}:`,
      error.message
    );
    return fallback();
  }
};

// --- API Helper Functions (AI Calls) ---
const callAiApi = async (prompt, taskType) => {
  let model;
  let apiUrl;
  let payload;
  let headers = {};
  let source = "Unknown";

  if (AI_CONFIG.useOllama) {
    model = AI_CONFIG.ollamaModels[taskType] || AI_CONFIG.ollamaModels.default;
    apiUrl = `${AI_CONFIG.ollamaBaseUrl}/api/generate`;
    payload = { model, prompt, stream: false, options: { temperature: 0.7 } };
    source = `Ollama (${model})`;
  } else if (AI_CONFIG.remoteApis.openRouter.key) {
    model = AI_CONFIG.remoteApis.openRouter.textGenerationModel;
    apiUrl = `${AI_CONFIG.remoteApis.openRouter.url}/chat/completions`;
    headers.Authorization = `Bearer ${AI_CONFIG.remoteApis.openRouter.key}`;
    payload = {
      model: model,
      messages: [{ role: "user", content: prompt }],
      parameters: {
        temperature: 0.7,
        max_tokens: 150,
      },
    };
    source = `OpenRouter (${model})`;
  } else if (AI_CONFIG.remoteApis.huggingFace.key) {
    model = AI_CONFIG.remoteApis.huggingFace.textGenerationModel;
    apiUrl = `${AI_CONFIG.remoteApis.huggingFace.url}/${model}`;
    headers.Authorization = `Bearer ${AI_CONFIG.remoteApis.huggingFace.key}`;
    payload = {
      inputs: prompt,
      parameters: {
        temperature: 0.7,
        max_tokens: 150,
      },
    };
    source = `Hugging Face (${model})`;
  } else {
    console.error("AI Error: No Ollama or remote API configured/available.");
    throw new Error("No suitable AI API configured.");
  }

  console.log(
    `Calling ${source} for ${taskType}: ${prompt.substring(0, 100)}...`
  );
  try {
    const response = await axios.post(apiUrl, payload, { headers });
    let result = null;
    if (AI_CONFIG.useOllama) result = response.data.response?.trim();
    else if (AI_CONFIG.remoteApis.openRouter.key)
      result = response.data.choices?.[0]?.message?.content?.trim();
    else if (AI_CONFIG.remoteApis.huggingFace.key)
      result = response.data?.[0]?.generated_text?.trim();

    if (!result) console.warn(`${source} returned empty response.`);
    else
      console.log(
        `AI Response received (first 100 chars): ${result.substring(0, 100)}`
      );
    return result;
  } catch (error) {
    console.error(
      `AI API Call Error Details (${source}):`,
      error.response?.data || error.message
    );
    if (
      error.response?.status === 404 &&
      error.response?.data?.error?.includes("not found")
    ) {
      console.error(
        `---> Specific Error: Model "${model}" not found at ${apiUrl}. Check source availability.`
      );
      throw new Error(`Model '${model}' not found via ${source}.`);
    }
    throw new Error(`AI API call via ${source} failed: ${error.message}`);
  }
};

// --- Text Generation Endpoint ---
app.post("/api/generate/text", async (req, res) => {
  const { prompt, taskType = "default" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  try {
    const result = await callAiApi(prompt, taskType);
    if (result === null || result === undefined)
      throw new Error("AI returned no response.");
    res.json({ result });
  } catch (error) {
    console.error(
      `Error in /api/generate/text (Task: ${taskType}):`,
      error.message
    );
    res
      .status(500)
      .json({ error: error.message || "Failed to generate AI content." });
  }
});

// --- Quiz Generation with Vector Enhancement and Fact-checking ---
app.post("/api/generate/quiz", async (req, res) => {
  const { topic, difficulty = "medium", numQuestions = 5 } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {
    const difficultyDesc =
      difficulty === "easy"
        ? "simple beginner"
        : difficulty === "hard"
        ? "challenging expert"
        : "intermediate";
    let previousQuestionsContext = "";

    await withChromaDB(
      "quiz_questions",
      async (collection) => {
        const results = await collection.query({
          queryTexts: [topic],
          nResults: 3,
          where: { difficulty: difficulty },
        });

        if (results && results.documents && results.documents.length > 0) {
          previousQuestionsContext = `\nHere are some example questions for inspiration:\n`;

          for (let i = 0; i < results.documents.length; i++) {
            const metadata = results.metadatas[i];
            const options = JSON.parse(metadata.options || "[]");
            previousQuestionsContext += `\nQuestion: ${results.documents[i]}\n`;
            previousQuestionsContext += `Options: ${options.join(", ")}\n`;
            previousQuestionsContext += `Correct Answer: ${metadata.correctAnswer}\n`;
          }
        }
      },
      () => {
        previousQuestionsContext = "";
        return null;
      }
    );

    const prompt = `Generate a ${numQuestions}-question multiple-choice quiz about "${topic}" at a ${difficultyDesc} level.
    ${previousQuestionsContext}
    
    IMPORTANT: The response MUST be ONLY a valid JSON object containing a single key "questions".
    Each question object in the "questions" array must have:
    - "question": The question text (string).
    - "options": An array of 4 strings representing the choices.
    - "correctIndex": The 0-based index of the correct answer within the "options" array (number).
    Example JSON format:
    {
      "questions": [
        {
          "question": "What is the capital of France?",
          "options": ["Berlin", "Madrid", "Paris", "Rome"],
          "correctIndex": 2
        }
      ]
    }
    DO NOT include any text before or after the JSON object.`;

    const result = await callAiApi(prompt, "quiz");
    if (!result) {
      throw new Error("AI returned no response");
    }

    try {
      const quizData = JSON.parse(result);

      if (
        quizData &&
        Array.isArray(quizData.questions) &&
        quizData.questions.length > 0
      ) {
        let validatedQuestions = quizData.questions;
        if (AI_CONFIG.groqApi.enabled) {
          console.log("Running Groq fact-checking on generated questions...");
          validatedQuestions = await factCheckQuizQuestions(
            quizData.questions,
            AI_CONFIG.groqApi.key
          );
          console.log("Fact-checking complete. Questions validated.");
        } else {
          console.log("Groq fact-checking skipped (no API key provided)");
        }

        quizData.questions = validatedQuestions;

        await withChromaDB(
          "quiz_questions",
          async (collection) => {
            for (let i = 0; i < quizData.questions.length; i++) {
              const question = quizData.questions[i];
              const correctAnswer = question.options[question.correctIndex];
              await collection.add({
                ids: [`${topic}-${difficulty}-${Date.now()}-${i}`],
                documents: [question.question],
                metadatas: [
                  {
                    topic,
                    difficulty,
                    options: JSON.stringify(question.options),
                    correctAnswer,
                    createdAt: new Date().toISOString(),
                  },
                ],
              });
            }
            console.log(
              `Stored ${quizData.questions.length} quiz questions in ChromaDB`
            );
          },
          () => {
            console.log(
              "Skipped storing quiz questions in ChromaDB (not available)"
            );
            return null;
          }
        );

        res.json(quizData);
      } else {
        throw new Error("Invalid quiz data structure");
      }
    } catch (jsonError) {
      console.error("Error parsing quiz JSON:", jsonError);
      res.status(500).json({
        error: "Failed to generate valid quiz",
        rawOutput: result,
      });
    }
  } catch (error) {
    console.error("Error generating quiz:", error.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

// --- Leaderboard Endpoint ---
app.get("/api/leaderboard", (req, res) => {
  db.all(
    "SELECT username, CAST(score AS INTEGER) as score FROM leaderboard ORDER BY score DESC LIMIT 50",
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching leaderboard:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to retrieve leaderboard." });
      }
      res.json(rows || []);
    }
  );
});

// --- User Progress Endpoints (Revised Logic) ---

const getOrCreateUserProgress = (username) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM user_progress WHERE username = ?",
      [username],
      (err, row) => {
        if (err) {
          console.error(
            `Error fetching progress for ${username}:`,
            err.message
          );
          return reject(new Error("Database error fetching progress."));
        }
        if (row) {
          try {
            row.badges = JSON.parse(row.badges || "[]");
          } catch {
            row.badges = [];
          }
          console.log(`Found progress for ${username}.`);
          resolve(row);
        } else {
          console.log(
            `No progress found for ${username}, creating default entry...`
          );
          const defaultProgress = {
            username: username,
            wordle_wins: 0,
            wordle_losses: 0,
            wordle_streak: 0,
            wordle_difficulty: "easy",
            wordle_completed_words: "[]",
            quiz_totalScore: 0,
            quiz_quizzesTaken: 0,
            quiz_avgScore: 0,
            quiz_difficulty: "easy",
            badges: "[]",
            totalScore: 0,
          };
          const columns = Object.keys(defaultProgress);
          const placeholders = columns.map(() => "?").join(",");
          const values = Object.values(defaultProgress);

          db.run(
            `INSERT INTO user_progress (${columns.join(
              ","
            )}) VALUES (${placeholders})`,
            values,
            function (insertErr) {
              if (insertErr) {
                console.error(
                  `Error creating progress entry for ${username}:`,
                  insertErr.message
                );
                return reject(
                  new Error("Database error creating progress entry.")
                );
              }
              console.log(
                `Default progress created for ${username} (ID: ${this.lastID})`
              );
              resolve({ ...defaultProgress, badges: [] });
            }
          );
        }
      }
    );
  });
};

app.get("/api/progress/:username", async (req, res) => {
  const { username } = req.params;
  if (!username)
    return res.status(400).json({ error: "Username parameter is required." });

  try {
    const progress = await getOrCreateUserProgress(username);
    const frontendProgress = mapDbToFrontendProgress(progress);
    res.json(frontendProgress);
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message || "Failed to retrieve user progress." });
  }
});

app.post("/api/progress", async (req, res) => {
  const { username, game, data } = req.body;
  if (!username || !game || !data) {
    return res
      .status(400)
      .json({ error: "Username, game, and data are required." });
  }
  console.log(
    `Received progress update for ${username}, game: ${game}, data:`,
    data
  );

  try {
    let currentProgress = await getOrCreateUserProgress(username);

    if (game === "wordle") {
      currentProgress.wordle_wins =
        (currentProgress.wordle_wins || 0) + (data.win ? 1 : 0);
      currentProgress.wordle_losses =
        (currentProgress.wordle_losses || 0) + (data.loss ? 1 : 0);
      if (data.win)
        currentProgress.wordle_streak =
          (currentProgress.wordle_streak || 0) + 1;
      else if (data.loss) currentProgress.wordle_streak = 0;

      if (data.word) {
        try {
          const completedWords = JSON.parse(
            currentProgress.wordle_completed_words || "[]"
          );
          if (!completedWords.includes(data.word)) {
            completedWords.push(data.word);
            currentProgress.wordle_completed_words =
              JSON.stringify(completedWords);
          }
        } catch (e) {
          console.error("Error parsing completed words:", e);
          currentProgress.wordle_completed_words = JSON.stringify([data.word]);
        }
      }

      if (data.difficulty) {
        currentProgress.wordle_difficulty = data.difficulty;
      }
    } else if (game === "quiz") {
      const quizzesTaken = (currentProgress.quiz_quizzesTaken || 0) + 1;
      const totalScore =
        (currentProgress.quiz_totalScore || 0) + (data.score || 0);
      currentProgress.quiz_quizzesTaken = quizzesTaken;
      currentProgress.quiz_totalScore = totalScore;
      currentProgress.quiz_avgScore =
        quizzesTaken > 0 ? totalScore / quizzesTaken : 0;
    }

    currentProgress.totalScore = calculateTotalScore(currentProgress);
    console.log(
      `Recalculated total score for ${username}: ${currentProgress.totalScore}`
    );

    const currentBadgesArray = currentProgress.badges;
    const newBadgesArray = checkBadges(currentProgress, currentBadgesArray);
    const badgesJson = JSON.stringify(newBadgesArray);
    console.log(
      `Badge check for ${username}. Old: ${JSON.stringify(
        currentBadgesArray
      )}, New: ${badgesJson}`
    );

    await new Promise((resolve, reject) => {
      const sql = `
                UPDATE user_progress SET
                    wordle_wins = ?, wordle_losses = ?, wordle_streak = ?, wordle_difficulty = ?,
                    wordle_completed_words = ?,
                    quiz_totalScore = ?, quiz_quizzesTaken = ?, quiz_avgScore = ?, quiz_difficulty = ?,
                    badges = ?, totalScore = ?, last_updated = CURRENT_TIMESTAMP
                WHERE username = ?`;

      const params = [
        currentProgress.wordle_wins,
        currentProgress.wordle_losses,
        currentProgress.wordle_streak,
        currentProgress.wordle_difficulty,
        currentProgress.wordle_completed_words,
        currentProgress.quiz_totalScore,
        currentProgress.quiz_quizzesTaken,
        currentProgress.quiz_avgScore,
        currentProgress.quiz_difficulty,
        badgesJson,
        currentProgress.totalScore,
        username,
      ];

      db.run(sql, params, function (updateErr) {
        if (updateErr) {
          console.error(
            `Error updating user progress in DB for ${username}:`,
            updateErr.message
          );
          return reject(new Error("Database error saving progress update."));
        }
        console.log(
          `Progress updated for user ${username}. Rows affected: ${this.changes}`
        );
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(
        "INSERT OR REPLACE INTO leaderboard (username, score) VALUES (?, ?)",
        [username, currentProgress.totalScore],
        function (leaderboardErr) {
          if (leaderboardErr) {
            console.error(
              `Error updating leaderboard for ${username}:`,
              leaderboardErr.message
            );
            return reject(new Error("Failed to update leaderboard."));
          } else {
            console.log(
              `Successfully updated leaderboard for ${username} with score ${currentProgress.totalScore}.`
            );
            db.run("PRAGMA wal_checkpoint(FULL)", (err) => {
              if (err) console.warn("Checkpoint warning:", err.message);
              resolve();
            });
          }
        }
      );
    });

    const frontendProgress = mapDbToFrontendProgress({
      ...currentProgress,
      badges: newBadgesArray,
    });
    res.json(frontendProgress);
  } catch (error) {
    console.error(
      `Error in POST /api/progress for ${username}:`,
      error.message
    );
    res
      .status(500)
      .json({ error: error.message || "Failed to update user progress." });
  }
});

// --- Helper Functions ---
function calculateTotalScore(p) {
  const baseScore = (p.wordle_wins || 0) * 10 + (p.quiz_totalScore || 0);
  const streakBonus = (p.wordle_streak || 0) * 5;
  const difficultyMultiplier =
    p.wordle_difficulty === "hard"
      ? 1.5
      : p.wordle_difficulty === "medium"
      ? 1.2
      : 1;
  return Math.round(baseScore * difficultyMultiplier + streakBonus);
}

function mapDbToFrontendProgress(dbProgress) {
  let completedWords = [];
  try {
    completedWords = JSON.parse(dbProgress.wordle_completed_words || "[]");
  } catch (e) {
    console.error("Error parsing completed words:", e);
  }
  return {
    username: dbProgress.username,
    wordle: {
      wins: dbProgress.wordle_wins,
      losses: dbProgress.wordle_losses,
      streak: dbProgress.wordle_streak,
      difficulty: dbProgress.wordle_difficulty,
      completedWords: completedWords,
    },
    quiz: {
      totalScore: dbProgress.quiz_totalScore,
      quizzesTaken: dbProgress.quiz_quizzesTaken,
      avgScore: dbProgress.quiz_avgScore,
      difficulty: dbProgress.quiz_difficulty,
    },
    badges: dbProgress.badges || [],
    totalScore: dbProgress.totalScore || 0,
  };
}

const BADGE_CRITERIA = {
  learner: (p) => p.wordle_wins + p.quiz_quizzesTaken >= 1,
  dedicated: (p) => p.wordle_wins + p.quiz_quizzesTaken >= 15,
  "wordle-novice": (p) => p.wordle_wins >= 5,
  "wordle-master": (p) => p.wordle_wins >= 20,
  "quiz-whiz": (p) => p.quiz_avgScore >= 0.8 && p.quiz_quizzesTaken >= 3,
  "quiz-expert": (p) => p.quiz_avgScore >= 0.9 && p.quiz_quizzesTaken >= 5,
  "persistent-player": (p) => p.wordle_wins + p.wordle_losses >= 10,
  "high-scorer": (p) => p.totalScore >= 200,
};

function checkBadges(userProgress, currentBadges = []) {
  const existingBadges = Array.isArray(currentBadges) ? [...currentBadges] : [];
  let updated = false;

  console.log(`Badge check: Progress state:`, {
    wordle_wins: userProgress.wordle_wins,
    quiz_quizzesTaken: userProgress.quiz_quizzesTaken,
    quiz_avgScore: userProgress.quiz_avgScore,
    totalScore: userProgress.totalScore,
  });

  for (const badgeId in BADGE_CRITERIA) {
    if (
      !existingBadges.includes(badgeId) &&
      BADGE_CRITERIA[badgeId](userProgress)
    ) {
      console.log(
        `User ${userProgress.username} meets criteria for new badge: ${badgeId}`
      );
      existingBadges.push(badgeId);
      updated = true;
    }
  }

  if (updated)
    console.log(`Final badges for ${userProgress.username}:`, existingBadges);
  return existingBadges;
}

// --- ChromaDB API Routes ---

// Store embeddings endpoint
app.post("/api/embeddings/store", async (req, res) => {
  const { type, topic, word, hint, difficulty, data } = req.body;

  if (!chromaAvailable) {
    return res.status(503).json({ error: "ChromaDB service unavailable" });
  }

  try {
    if (type === "quiz") {
      await withChromaDB(
        "quiz_questions",
        async (collection) => {
          for (let i = 0; i < data.questions.length; i++) {
            const question = data.questions[i];
            const correctAnswer = question.options[question.correctIndex];

            await collection.add({
              ids: [`${topic}-${difficulty}-${Date.now()}-${i}`],
              documents: [question.question],
              metadatas: [
                {
                  topic,
                  difficulty,
                  options: JSON.stringify(question.options),
                  correctAnswer,
                  createdAt: new Date().toISOString(),
                },
              ],
            });
          }
          return true;
        },
        () => false
      );
    } else if (type === "wordle") {
      await withChromaDB(
        "wordle_words",
        async (collection) => {
          await collection.add({
            ids: [`${word}-${Date.now()}`],
            documents: [word],
            metadatas: [
              {
                hint,
                difficulty,
                length: word.length,
                createdAt: new Date().toISOString(),
              },
            ],
          });
          return true;
        },
        () => false
      );
    } else {
      return res.status(400).json({ error: "Invalid embedding type" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error storing embeddings:", error);
    res.status(500).json({ error: "Failed to store embeddings" });
  }
});

// Get similar items endpoint
app.get("/api/embeddings/similar", async (req, res) => {
  const { type, topic, difficulty, count = 3 } = req.query;

  if (!chromaAvailable) {
    return res.status(503).json({ error: "ChromaDB service unavailable" });
  }

  try {
    if (type === "quiz") {
      const results = await withChromaDB(
        "quiz_questions",
        async (collection) => {
          const queryResults = await collection.query({
            queryTexts: [topic],
            nResults: parseInt(count),
            where: { difficulty },
          });

          return queryResults;
        },
        () => null
      );

      if (!results) {
        return res.status(404).json({ error: "No similar questions found" });
      }

      const formattedResults = results.documents.map((doc, idx) => {
        const metadata = results.metadatas[idx];
        return {
          question: doc,
          options: JSON.parse(metadata.options || "[]"),
          correctAnswer: metadata.correctAnswer,
        };
      });

      res.json({ results: formattedResults });
    } else {
      return res.status(400).json({ error: "Invalid embedding type" });
    }
  } catch (error) {
    console.error("Error retrieving similar items:", error);
    res.status(500).json({ error: "Failed to retrieve similar items" });
  }
});

// Get Wordle words endpoint
app.get("/api/embeddings/wordle", async (req, res) => {
  const { difficulty } = req.query;

  if (!chromaAvailable) {
    return res.status(503).json({ error: "ChromaDB service unavailable" });
  }

  try {
    const results = await withChromaDB(
      "wordle_words",
      async (collection) => {
        const queryResults = await collection.get({
          where: difficulty ? { difficulty } : undefined,
          limit: 100,
        });

        return queryResults;
      },
      () => null
    );

    if (!results) {
      return res.json({ words: [] });
    }

    const words = results.documents;
    res.json({ words });
  } catch (error) {
    console.error("Error retrieving Wordle words:", error);
    res.status(500).json({ error: "Failed to retrieve Wordle words" });
  }
});

// Get ChromaDB status endpoint
app.get("/api/chromadb/status", async (req, res) => {
  try {
    const heartbeat = await fetch("http://localhost:8000/api/v1/heartbeat", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }).catch(() => null);

    if (!heartbeat || !heartbeat.ok) {
      return res.json({
        available: false,
        message: "ChromaDB server is not running",
      });
    }

    res.json({
      available: true,
      quizCollectionExists: !!quizCollection,
      wordleCollectionExists: !!wordleCollection,
      message: "ChromaDB server is running and collections are available",
    });
  } catch (error) {
    res.json({
      available: false,
      error: error.message,
      message: "Error checking ChromaDB status",
    });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("SIGINT received, closing database connection...");
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(err ? 1 : 0);
  });
});
