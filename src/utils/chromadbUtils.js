import axios from "axios";

// Base URL for ChromaDB server
const CHROMADB_URL = "http://localhost:8000";

/**
 * Check if the ChromaDB server is running
 * @returns {Promise<boolean>} - Whether the server is available
 */
export const isChromaDBAvailable = async () => {
  try {
    const response = await axios.get(`${CHROMADB_URL}/api/v1/heartbeat`);
    return response.status === 200;
  } catch (error) {
    console.error("ChromaDB server is not available:", error.message);
    return false;
  }
};

/**
 * Adds quiz question embeddings to the vector database
 * @param {Object} quizData - The quiz data with questions and answers
 * @param {string} topic - The quiz topic
 * @param {string} difficulty - The quiz difficulty level
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export const storeQuizEmbeddings = async (quizData, topic, difficulty) => {
  if (!quizData || !quizData.questions || !quizData.questions.length) {
    return false;
  }

  try {
    // We'll use our backend as a proxy to ChromaDB
    const response = await axios.post(
      "http://localhost:3001/api/embeddings/store",
      {
        type: "quiz",
        topic,
        difficulty,
        data: quizData,
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error("Failed to store quiz embeddings:", error.message);
    return false;
  }
};

/**
 * Retrieve similar quiz questions from ChromaDB
 * @param {string} topic - The quiz topic
 * @param {string} difficulty - The difficulty level
 * @param {number} count - Number of questions to retrieve
 * @returns {Promise<Array|null>} - Array of similar questions or null on failure
 */
export const getSimilarQuizQuestions = async (topic, difficulty, count = 3) => {
  try {
    const response = await axios.get(
      "http://localhost:3001/api/embeddings/similar",
      {
        params: {
          type: "quiz",
          topic,
          difficulty,
          count,
        },
      }
    );

    return response.data.results || null;
  } catch (error) {
    console.error("Failed to retrieve similar quiz questions:", error.message);
    return null;
  }
};

/**
 * Store a Wordle word with its hint in ChromaDB
 * @param {string} word - The Wordle word
 * @param {string} hint - The generated hint
 * @param {string} difficulty - The difficulty level
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export const storeWordleWord = async (word, hint, difficulty) => {
  try {
    const response = await axios.post(
      "http://localhost:3001/api/embeddings/store",
      {
        type: "wordle",
        word,
        hint,
        difficulty,
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error("Failed to store Wordle word:", error.message);
    return false;
  }
};

/**
 * Get a list of previously used Wordle words for a user
 * @param {string} difficulty - The difficulty level
 * @returns {Promise<Array|null>} - Array of words or null on failure
 */
export const getPreviousWordleWords = async (difficulty) => {
  try {
    const response = await axios.get(
      "http://localhost:3001/api/embeddings/wordle",
      {
        params: {
          difficulty,
        },
      }
    );

    return response.data.words || null;
  } catch (error) {
    console.error("Failed to retrieve previous Wordle words:", error.message);
    return null;
  }
};
