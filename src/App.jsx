import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import WordleGame from "./games/WordleGame";
// import JigsawGame from "./games/JigsawGame"; // Removed
import QuizGame from "./games/QuizGame";
import UserProfile from "./components/UserProfile";
import Leaderboard from "./components/Leaderboard";
import {
  getUserProgress,
  updateUserProgress,
  getEarnedBadges,
} from "./utils/progressUtils";
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
  const [userProgress, setUserProgress] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || null
  );
  const navigate = useNavigate();

  const handleSetUsername = useCallback(
    (newUsername) => {
      if (
        newUsername &&
        typeof newUsername === "string" &&
        newUsername.trim()
      ) {
        const trimmedUsername = newUsername.trim();
        localStorage.setItem("username", trimmedUsername);
        setUsername(trimmedUsername);
      } else {
        localStorage.removeItem("username");
        setUsername(null);
        setUserProgress(null);
        setBadges([]);
        navigate("/");
      }
    },
    [navigate]
  );

  const fetchProgress = useCallback(async (currentUser) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log(`App: Fetching progress for ${currentUser}...`);
      const progress = await getUserProgress(currentUser); // Assuming progressUtils is adapted for username if needed
      console.log("App: Progress fetched:", progress);
      setUserProgress(progress);
      // Ensure badges from progress are used
      setBadges(Array.isArray(progress?.badges) ? progress.badges : []);
    } catch (err) {
      console.error("App: Failed to load user progress:", err);
      setError("Could not load player data.");
      setUserProgress(null);
      setBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) {
      fetchProgress(username);
    } else {
      setUserProgress(null);
      setBadges([]);
      setLoading(false);
    }
  }, [username, fetchProgress]);

  const handleUpdateProgress = async (game, data) => {
    if (!username) {
      setError("You must be logged in to save progress.");
      return;
    }
    try {
      setLoading(true); // Indicate saving
      const updatedProgress = await updateUserProgress(username, game, data);
      console.log("App: Progress updated:", updatedProgress);
      setUserProgress(updatedProgress);
      // Ensure badges from updated progress are used
      setBadges(
        Array.isArray(updatedProgress?.badges) ? updatedProgress.badges : []
      );
      setError(null);
    } catch (err) {
      console.error(`App: Failed to update progress for ${game}:`, err);
      setError(`Failed to save progress for ${game}.`);
      // Optionally refetch progress here to ensure consistency if update failed partially
      // await fetchProgress(username);
    } finally {
      setLoading(false);
    }
  };

  const RequestUsername = () => {
    /* ... (same as before) ... */
    const [inputUsername, setInputUsername] = useState("");
    const handleSubmit = (e) => {
      e.preventDefault();
      handleSetUsername(inputUsername);
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-lg shadow-md"
        >
          <h2 className="text-2xl font-semibold mb-4">Enter your username</h2>
          <input
            type="text"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            placeholder="Username"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Playing
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link to="/" className="font-bold text-xl hover:text-yellow-300">
                GenAI Games
              </Link>
            </div>
            {/* Desktop Nav Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? "bg-purple-700" : "hover:bg-blue-600"
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? "bg-purple-700" : "hover:bg-blue-600"
                    }`
                  }
                >
                  Leaderboard
                </NavLink>
                {username && (
                  <>
                    <NavLink
                      to="/wordle"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium ${
                          isActive ? "bg-purple-700" : "hover:bg-blue-600"
                        }`
                      }
                    >
                      WordleAI
                    </NavLink>
                    {/* Jigsaw Link Removed */}
                    <NavLink
                      to="/quiz"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium ${
                          isActive ? "bg-purple-700" : "hover:bg-blue-600"
                        }`
                      }
                    >
                      AI Quiz
                    </NavLink>
                    <NavLink
                      to="/profile"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium ${
                          isActive ? "bg-purple-700" : "hover:bg-blue-600"
                        }`
                      }
                    >
                      Profile ({username})
                    </NavLink>
                    <button
                      onClick={() => handleSetUsername(null)}
                      className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600 bg-red-500"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        {/* Loading/Error Indicators */}
        {loading && (
          <div className="fixed top-16 left-0 w-full h-1 bg-yellow-400 animate-pulse"></div>
        )}
        {error && !loading && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            {error}{" "}
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-700"
            >
              &times;
            </button>
          </div>
        )}

        {/* Routing Logic */}
        {!username ? (
          <RequestUsername />
        ) : loading && !userProgress ? (
          <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <LoadingSpinner />
          </div>
        ) : userProgress ? (
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard userProgress={userProgress} badges={badges} />
              }
            />
            <Route
              path="/leaderboard"
              element={<Leaderboard currentUser={username} />}
            />
            <Route
              path="/wordle"
              element={
                <WordleGame
                  userProgress={userProgress}
                  updateProgress={handleUpdateProgress}
                />
              }
            />
            {/* Jigsaw Route Removed */}
            <Route
              path="/quiz"
              element={
                <QuizGame
                  userProgress={userProgress}
                  updateProgress={handleUpdateProgress}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <UserProfile
                  userProgress={userProgress}
                  badges={badges}
                  onUsernameChange={handleSetUsername}
                />
              }
            />
            <Route
              path="*"
              element={
                <Dashboard userProgress={userProgress} badges={badges} />
              }
            />{" "}
            {/* Fallback */}
          </Routes>
        ) : (
          <div className="text-center text-gray-600">
            Could not load user data. Please try logging out and back in.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center p-4 mt-auto">
        © 2025 GenAI Interactive Learning Games
      </footer>
    </div>
  );
}

export default App;
