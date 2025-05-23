import React from "react";
import { Link } from "react-router-dom";
import BadgeDisplay from "./BadgeDisplay";
import { BADGE_INFO } from "../utils/progressUtils"; // Assuming BADGE_INFO is exported
import ChromaDBStatus from "./ChromaDBStatus";

function Dashboard({ userProgress, badges }) {
  // Function to get a simple recommendation (can be improved)
  const getRecommendation = (progress) => {
    if (!progress) return null;

    const wordlePlayed =
      (progress.wordle?.wins || 0) + (progress.wordle?.losses || 0) > 0;
    const quizPlayed = (progress.quiz?.quizzesTaken || 0) > 0;

    if (!wordlePlayed)
      return { text: "Try the WordleAI challenge!", link: "/wordle" };
    if (!quizPlayed)
      return { text: "Test your knowledge with an AI Quiz!", link: "/quiz" };

    // Simple recommendation based on lower relative engagement or performance
    if (
      (progress.wordle?.wins || 0) < 5 &&
      (progress.quiz?.quizzesTaken || 0) >= 3
    ) {
      return {
        text: "Sharpen your vocabulary with WordleAI!",
        link: "/wordle",
      };
    }
    if (
      (progress.quiz?.avgScore || 0) < 0.7 &&
      (progress.wordle?.wins || 0) >= 5
    ) {
      return { text: "Boost your score in the AI Quiz!", link: "/quiz" };
    }

    return { text: "Keep playing to earn more badges!", link: "/profile" }; // Generic fallback
  };

  const recommendation = getRecommendation(userProgress);
  const badgesToDisplay = Array.isArray(badges) ? badges : []; // Ensure badges is an array

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Welcome, {userProgress?.username || "Player"}!
      </h1>

      {/* Quick Actions / Game Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/wordle"
          className="block p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <h2 className="text-2xl font-semibold mb-2">WordleAI</h2>
          <p>Guess the hidden word generated by AI.</p>
        </Link>
        <Link
          to="/quiz"
          className="block p-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <h2 className="text-2xl font-semibold mb-2">AI Quiz</h2>
          <p>Test your knowledge with AI-generated quizzes.</p>
        </Link>
        {/* Jigsaw Link Removed */}
      </div>

      {/* ChromaDB Status - shown only to make debugging easier */}
      <ChromaDBStatus />

      {/* Recommendation Section */}
      {recommendation && (
        <div className="mb-8 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
          <h3 className="font-semibold mb-1">Next Steps:</h3>
          <Link to={recommendation.link} className="hover:underline">
            {recommendation.text}
          </Link>
        </div>
      )}

      {/* Summary Stats & Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            Your Progress
          </h3>
          <div className="space-y-2 text-gray-600">
            <p>
              Total Score:{" "}
              <span className="font-bold text-indigo-600">
                {userProgress?.totalScore || 0}
              </span>
            </p>
            <p>
              Wordle Wins:{" "}
              <span className="font-bold text-indigo-600">
                {userProgress?.wordle?.wins || 0}
              </span>
            </p>
            <p>
              Quizzes Taken:{" "}
              <span className="font-bold text-indigo-600">
                {userProgress?.quiz?.quizzesTaken || 0}
              </span>
            </p>
            {/* Add more stats if needed */}
          </div>
          <Link
            to="/profile"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            View Full Profile
          </Link>
        </div>

        {/* Badges Preview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            Badges ({badgesToDisplay.length})
          </h3>
          {badgesToDisplay.length > 0 ? (
            // Pass the badges array received from App state
            <BadgeDisplay
              badges={badgesToDisplay}
              badgeInfo={BADGE_INFO}
              displayLimit={6}
            /> // Show a limited number
          ) : (
            <p className="text-gray-500">Play games to earn badges!</p>
          )}
          <Link
            to="/profile"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            View All Badges
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
