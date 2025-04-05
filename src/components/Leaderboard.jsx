import { useState, useEffect } from "react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE_URL = "http://localhost:3001/api"; // Match backend port

function Leaderboard({ currentUser }) {
  // Receive current user's username
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/leaderboard`);
        setLeaderboardData(response.data || []); // Ensure it's an array
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        setError("Could not load leaderboard data. Please try again later.");
        setLeaderboardData([]); // Set empty on error
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []); // Fetch only once on mount

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Leaderboard
      </h2>
      {leaderboardData.length === 0 ? (
        <p className="text-center text-gray-500">
          No scores yet. Be the first!
        </p>
      ) : (
        <ol className="list-decimal list-inside space-y-3">
          {leaderboardData.map((entry, index) => (
            <li
              key={index}
              className={`p-3 rounded-md flex justify-between items-center text-lg ${
                index === 0 ? "bg-yellow-200 font-bold" : "" // Highlight top player
              } ${
                entry.username === currentUser
                  ? "bg-blue-100 ring-2 ring-blue-300"
                  : "" /* Highlight current user */
              } `}
            >
              <span>
                <span className="font-semibold mr-3">{index + 1}.</span>
                {entry.username || "Anonymous"}
              </span>
              <span className="font-bold text-indigo-600">
                {entry.score || 0} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default Leaderboard;
