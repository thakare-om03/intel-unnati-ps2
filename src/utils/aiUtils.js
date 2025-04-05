import axios from "axios";

// Base URL for your backend server
const API_BASE_URL = "http://localhost:3001/api"; // Match backend port

/**
 * Generates text content using the backend endpoint.
 * @param {string} prompt - The prompt for the AI.
 * @param {string} taskType - Helps backend select appropriate model/logic (e.g., 'wordle', 'quiz', 'hint').
 * @returns {Promise<string>} - The generated text content.
 */
const generateText = async (prompt, taskType = "default") => {
  try {
    const response = await axios.post(`${API_BASE_URL}/generate/text`, {
      prompt,
      taskType,
    });
    if (!response.data || !response.data.result) {
      throw new Error("Invalid response from backend text generation.");
    }
    return response.data.result;
  } catch (error) {
    console.error(
      "Error generating text via backend:",
      error.response?.data || error.message
    );
    // Provide a more user-friendly error or fallback
    throw new Error(
      `Failed to generate content: ${
        error.response?.data?.error || error.message
      }`
    );
  }
};

/**
 * Generates an image using the backend endpoint.
 * @param {string} prompt - The prompt for image generation.
 * @returns {Promise<string|null>} - The generated image URL (likely base64 data URL) or null on failure.
 */
const generateImage = async (prompt) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/generate/image`, {
      prompt,
    });
    // Check for explicit null or missing imageUrl in case of backend failure/non-support
    if (response.data && response.data.imageUrl) {
      return response.data.imageUrl;
    } else {
      console.warn("Backend did not return a valid image URL.", response.data);
      return null; // Indicate failure or lack of image
    }
  } catch (error) {
    console.error(
      "Error generating image via backend:",
      error.response?.data || error.message
    );
    // Return null or throw, depending on how you want to handle fallback in components
    return null;
    // throw new Error(`Failed to generate image: ${error.response?.data?.error || error.message}`);
  }
};

// --- Specific Game Functions ---

/**
 * Generates a Wordle word based on difficulty and avoids previously completed words.
 * @param {string} difficulty - 'easy' (4), 'medium' (5), 'hard' (6).
 * @param {Array<string>} completedWords - Words already completed by the user.
 * @returns {Promise<string>} - The target word.
 */
export const generateWordleWord = async (difficulty, completedWords = []) => {
  const length = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;
  const completedWordsSet = new Set(completedWords);

  // Add detail about avoiding previously played words
  const prompt = `Generate a single, common, ${length}-letter English word suitable for a Wordle game. 
  The word should be engaging and not too obscure. 
  Only output the word itself, nothing else. For example: game`;

  // Try up to 5 times to get a word that hasn't been played
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const word = await generateText(prompt, "wordle");

    // Basic validation
    if (word && word.length === length && /^[a-zA-Z]+$/.test(word)) {
      const cleanWord = word.toLowerCase().trim();
      if (!completedWordsSet.has(cleanWord)) {
        return cleanWord;
      }
      console.log(`Word ${cleanWord} already played, trying again...`);
    }
  }

  // If we couldn't find a new word after MAX_ATTEMPTS, use words from our static list
  console.warn("Couldn't generate a unique word, using fallback");

  // Get words from static list and filter out completed ones
  const { words } = await import("../words.js");
  const difficultyWords = [
    ...words[difficulty],
    ...words.hardWords[difficulty],
  ];
  const availableWords = difficultyWords.filter(
    (w) => !completedWordsSet.has(w)
  );

  if (availableWords.length > 0) {
    // Pick a random word from available words
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }

  // Ultimate fallback if all words have been played
  const fallbacks = {
    easy: ["play", "game", "word", "code"],
    medium: ["train", "think", "learn", "skill"],
    hard: ["puzzle", "master", "wisdom", "design"],
  };
  return fallbacks[difficulty][
    Math.floor(Math.random() * fallbacks[difficulty].length)
  ];
};

/**
 * Generates a hint for a given Wordle word.
 * @param {string} word - The target word.
 * @returns {Promise<string>} - A hint for the word.
 */
export const generateWordHint = async (word) => {
  const prompt = `Generate a short, one-sentence hint for the Wordle word "${word}". The hint should be clever but not too obvious. Example hint for 'train': 'It runs on tracks.'`;
  const hint = await generateText(prompt, "hint");
  return hint || `It's a ${word.length}-letter word.`; // Fallback hint
};

/**
 * Generates quiz questions based on a topic and difficulty.
 * @param {string} topic - The subject of the quiz.
 * @param {string} difficulty - 'easy', 'medium', 'hard'.
 * @param {number} numQuestions - Number of questions to generate.
 * @returns {Promise<object>} - The quiz data object { questions: [...] }.
 */
export const generateQuiz = async (
  topic,
  difficulty = "medium",
  numQuestions = 5
) => {
  const difficultyDesc =
    difficulty === "easy"
      ? "simple beginner"
      : difficulty === "hard"
      ? "challenging expert"
      : "intermediate";

  // Request includes difficulty and user context to the backend
  try {
    const response = await axios.post(`${API_BASE_URL}/generate/quiz`, {
      topic,
      difficulty,
      numQuestions,
    });

    // If backend successfully generates quiz with vector-enhanced content
    if (response.data && response.data.questions) {
      console.log("Received quiz with vector-enhanced content");
      return response.data;
    }
  } catch (error) {
    console.warn(
      "Vector-based quiz generation failed, falling back to standard generation"
    );
    // Fall back to standard generation on error
  }

  // Improved prompt asking for ONLY JSON
  const prompt = `Generate a ${numQuestions}-question multiple-choice quiz about "${topic}" at a ${difficultyDesc} level.
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
      },
      {
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correctIndex": 1
      }
    ]
  }

  DO NOT include any text before or after the JSON object.`;

  const jsonString = await generateText(prompt, "quiz");

  try {
    const quizData = JSON.parse(jsonString);
    // Basic validation of the parsed structure
    if (
      quizData &&
      Array.isArray(quizData.questions) &&
      quizData.questions.length > 0 &&
      quizData.questions[0].options
    ) {
      // Trim options just in case AI adds whitespace
      quizData.questions.forEach((q) => {
        q.options = q.options.map((opt) => opt.trim());
      });
      return quizData;
    } else {
      throw new Error("Generated JSON has incorrect structure.");
    }
  } catch (error) {
    console.error("Failed to parse generated quiz JSON:", error);
    console.error("Received string:", jsonString); // Log what was received
    // Provide fallback quiz data
    return {
      questions: [
        {
          question: "Quiz generation failed. Try again?",
          options: ["Yes", "No"],
          correctIndex: 0,
        },
      ],
    };
  }
};

/**
 * Generates an image for the Jigsaw puzzle based on a topic.
 * Uses the backend image generation endpoint.
 * @param {string} topic - The topic for the image.
 * @returns {Promise<string|null>} - The image URL (base64 data URI) or null.
 */
export const generateJigsawImage = async (topic) => {
  const prompt = `Generate an educational and visually interesting, safe-for-work image related to the topic: "${topic}". The image should be suitable for a jigsaw puzzle.`;
  // This call now goes through our backend's /api/generate/image endpoint
  const imageUrl = await generateImage(prompt);
  return imageUrl; // Will be base64 data URL or null
};
