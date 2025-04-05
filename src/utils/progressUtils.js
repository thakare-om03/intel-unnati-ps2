import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api"; // Match backend port

// Helper to get the current username
const getUsername = () => localStorage.getItem("username") || "Player";

/**
 * Get user progress from the backend.
 * Initializes with default structure if user not found on backend.
 * @returns {Promise<object>} User progress object.
 */
export const getUserProgress = async () => {
  const username = getUsername();
  try {
    const response = await axios.get(`${API_BASE_URL}/progress/${username}`);
    console.log("Retrieved user progress:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching user progress:",
      error.response?.data || error.message
    );
    // Return a default structure on error
    return {
      username: username,
      wordle: { wins: 0, losses: 0, streak: 0, difficulty: "easy" },
      quiz: { totalScore: 0, quizzesTaken: 0, avgScore: 0, difficulty: "easy" },
      badges: [],
      totalScore: 0,
    };
  }
};

/**
 * Update user progress for a specific game via the backend.
 * @param {string} username - The username.
 * @param {string} game - The game identifier (e.g., 'wordle', 'quiz').
 * @param {object} data - Game-specific data for the update.
 * @returns {Promise<object>} The updated user progress object from the backend.
 */
export const updateUserProgress = async (username, game, data) => {
  if (!username) {
    console.error("Cannot update progress: Username is missing");
    throw new Error("Username is required to update progress");
  }

  try {
    console.log(`Updating progress for ${username}, game: ${game}`, data);
    const response = await axios.post(`${API_BASE_URL}/progress`, {
      username,
      game,
      data,
    });
    console.log("Progress update response:", response.data);
    return response.data; // Return the updated progress from the backend
  } catch (error) {
    console.error(
      "Error updating user progress:",
      error.response?.data || error.message
    );
    // Maybe re-fetch progress or return null/previous state?
    // For simplicity, just re-throwing for now
    throw new Error(
      `Failed to update progress: ${
        error.response?.data?.error || error.message
      }`
    );
  }
};

/**
 * Get the recommended difficulty for a game based on fetched user progress.
 * @param {object} userProgress - The user progress object.
 * @param {string} game - The game identifier ('wordle', 'quiz', 'jigsaw').
 * @returns {string} - Recommended difficulty ('easy', 'medium', 'hard').
 */
export const getRecommendedDifficulty = (userProgress, game) => {
  // Access difficulty directly from the progress object managed by the backend
  return userProgress?.[game]?.difficulty || "easy";
};

/**
 * Gets the list of earned badges from the user progress object.
 * @param {object} userProgress - The user progress object.
 * @returns {Array<string>} - Array of earned badge IDs.
 */
export const getEarnedBadges = (userProgress) => {
  return userProgress?.badges || [];
};

// Updated badge definitions with improved descriptions
export const BADGE_INFO = {
  learner: {
    icon: "🎓",
    name: "Quick Learner",
    description: "Complete your first activity",
  },
  dedicated: {
    icon: "🎯",
    name: "Dedicated Player",
    description: "Complete 15 activities total",
  },
  "wordle-novice": {
    icon: "🔤",
    name: "Wordle Novice",
    description: "Win 5 Wordle games",
  },
  "wordle-master": {
    icon: "🏆",
    name: "Wordle Master",
    description: "Win 20 Wordle games",
  },
  "quiz-whiz": {
    icon: "💡",
    name: "Quiz Whiz",
    description: "Average 80%+ on 3+ quizzes",
  },
  "quiz-expert": {
    icon: "🧠",
    name: "Quiz Expert",
    description: "Average 90%+ on 5+ quizzes",
  },
  "persistent-player": {
    icon: "⚡",
    name: "Persistent Player",
    description: "Play 10 Wordle games",
  },
  "high-scorer": {
    icon: "🌟",
    name: "High Scorer",
    description: "Achieve a total score of 200 points",
  },
};
