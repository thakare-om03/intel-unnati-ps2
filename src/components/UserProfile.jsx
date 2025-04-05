import { useState } from "react";
import BadgeDisplay from "./BadgeDisplay";
import { BADGE_INFO } from "../utils/progressUtils";

function UserProfile({ userProgress, badges, onUsernameChange }) {
  const [newUsername, setNewUsername] = useState(userProgress?.username || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleEditToggle = () => {
    /* ... (same as before) ... */
    if (isEditing) {
      if (newUsername.trim() && newUsername.trim() !== userProgress.username) {
        onUsernameChange(newUsername.trim());
      } else {
        setNewUsername(userProgress.username);
      }
    }
    setIsEditing(!isEditing);
  };
  const handleInputChange = (event) => {
    setNewUsername(event.target.value);
  };

  // Calculate stats (Jigsaw removed)
  const calculateStats = (progress) => {
    return {
      wordleWins: progress?.wordle?.wins || 0,
      quizzesTaken: progress?.quiz?.quizzesTaken || 0,
      quizAvgScore: progress?.quiz?.avgScore || 0,
      totalScore: progress?.totalScore || 0,
    };
  };
  const stats = calculateStats(userProgress);

  // Ensure badges is always an array for rendering
  const badgesToDisplay = Array.isArray(badges) ? badges : [];

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      {/* Header and Logout Button (same as before) */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 sm:mb-0">
          User Profile
        </h2>
        <button
          onClick={() => onUsernameChange(null)}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
        >
          Logout
        </button>
      </div>

      {/* Username Editing (same as before) */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-lg font-semibold text-gray-700">Username:</label>
        {isEditing ? (
          <input
            type="text"
            value={newUsername}
            onChange={handleInputChange}
            className="flex-grow px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            autoFocus
          />
        ) : (
          <span className="text-lg text-indigo-600">
            {userProgress.username}
          </span>
        )}
        <button
          onClick={handleEditToggle}
          className="text-sm text-blue-600 hover:underline ml-auto"
        >
          {isEditing ? "Save" : "Edit"}
        </button>
      </div>

      {/* Stats Section (Jigsaw Removed) */}
      <div className="mb-6 border-t pt-4">
        <h3 className="text-xl font-semibold mb-3 text-gray-700">Stats</h3>
        <div className="grid grid-cols-2 gap-4 text-gray-600">
          <p>
            Wordle Wins:{" "}
            <span className="font-bold text-indigo-600">
              {stats.wordleWins}
            </span>
          </p>
          <p>
            Quizzes Taken:{" "}
            <span className="font-bold text-indigo-600">
              {stats.quizzesTaken}
            </span>
          </p>
          <p>
            Avg Quiz Score:{" "}
            <span className="font-bold text-indigo-600">
              {(stats.quizAvgScore * 100).toFixed(1)}%
            </span>
          </p>
          <p>
            Total Score:{" "}
            <span className="font-bold text-indigo-600">
              {stats.totalScore}
            </span>
          </p>
        </div>
      </div>

      {/* Badges Section */}
      <div className="border-t pt-4">
        <h3 className="text-xl font-semibold mb-3 text-gray-700">
          Badges Earned ({badgesToDisplay.length})
        </h3>
        {badgesToDisplay.length > 0 ? (
          // Pass the badges array received from App state
          <BadgeDisplay badges={badgesToDisplay} badgeInfo={BADGE_INFO} />
        ) : (
          <p className="text-gray-500">No badges earned yet. Keep playing!</p>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
