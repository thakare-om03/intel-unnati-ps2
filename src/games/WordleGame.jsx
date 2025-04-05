import { useState, useEffect, useCallback } from "react";
import { generateWordleWord, generateWordHint } from "../utils/aiUtils";
import { getRecommendedDifficulty } from "../utils/progressUtils";
import LoadingSpinner from "../components/LoadingSpinner";
// Assuming wordImages provides placeholder/fallback images if hints need them
// import { wordImages } from "../images"; // Only if using image hints

const MAX_GUESSES = 6;

function WordleGame({ userProgress, updateProgress }) {
  const [difficulty, setDifficulty] = useState("easy"); // Default or from progress
  const [wordLength, setWordLength] = useState(0);
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState([]); // Array of guess strings
  const [currentGuess, setCurrentGuess] = useState("");
  const [evaluations, setEvaluations] = useState([]); // Array of arrays for cell status ('correct', 'present', 'absent')
  const [gameState, setGameState] = useState("loading"); // 'loading', 'playing', 'won', 'lost'
  const [hint, setHint] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [error, setError] = useState("");
  const [keyboardStatus, setKeyboardStatus] = useState({}); // Track used letter status
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);

  // Track performance metrics for dynamic difficulty adjustment
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [shouldIncreaseDifficulty, setShouldIncreaseDifficulty] =
    useState(false);
  const [shouldDecreaseDifficulty, setShouldDecreaseDifficulty] =
    useState(false);

  // Set initial difficulty and start game
  useEffect(() => {
    const recommended = getRecommendedDifficulty(userProgress, "wordle");
    setDifficulty(recommended);
    const length =
      recommended === "easy" ? 4 : recommended === "medium" ? 5 : 6;
    setWordLength(length);
    startNewGame(recommended); // Start game automatically on load/difficulty change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProgress]); // Rerun if progress object changes (e.g., difficulty update)

  const startNewGame = useCallback(
    async (diff) => {
      setGameState("loading");
      setError("");
      setHint("");
      setLoadingHint(false);
      setCurrentGuess("");
      setGuesses([]);
      setEvaluations([]);
      setKeyboardStatus({}); // Reset keyboard status

      const length = diff === "easy" ? 4 : diff === "medium" ? 5 : 6;
      setWordLength(length);

      try {
        // Get completed words from user progress
        const completedWords = userProgress?.wordle?.completedWords || [];
        console.log("Completed words:", completedWords);

        const word = await generateWordleWord(diff, completedWords);
        console.log("Generated word:", word);
        setTargetWord(word);
        setGameState("playing");
      } catch (err) {
        console.error("Failed to start Wordle game:", err);
        setError("Could not generate a word. Please try again.");
        setGameState("error"); // Or maybe fallback to a default word?
      }
    },
    [userProgress]
  ); // No dependencies needed if logic is self-contained

  const handleInputChange = (event) => {
    const value = event.target.value.toLowerCase().replace(/[^a-z]/g, ""); // Allow only letters
    if (value.length <= wordLength) {
      setCurrentGuess(value);
    }
  };

  const updateKeyboardStatus = (guess, evaluation) => {
    const newStatus = { ...keyboardStatus };
    guess.split("").forEach((letter, index) => {
      const currentStatus = newStatus[letter];
      const newEval = evaluation[index];

      // Update priority: correct > present > absent
      if (newEval === "correct") {
        newStatus[letter] = "correct";
      } else if (newEval === "present" && currentStatus !== "correct") {
        newStatus[letter] = "present";
      } else if (newEval === "absent" && !currentStatus) {
        newStatus[letter] = "absent";
      }
    });
    setKeyboardStatus(newStatus);
  };

  const handleGuessSubmit = () => {
    if (currentGuess.length !== wordLength || gameState !== "playing") {
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    const newEvaluations = [
      ...evaluations,
      evaluateGuess(currentGuess, targetWord),
    ];

    setGuesses(newGuesses);
    setEvaluations(newEvaluations);
    updateKeyboardStatus(
      currentGuess,
      newEvaluations[newEvaluations.length - 1]
    ); // Update keyboard based on last eval

    // Check game state
    if (currentGuess === targetWord) {
      setGameState("won");
      // Record this game's performance
      setPerformanceHistory((prev) => [
        ...prev,
        {
          won: true,
          guesses: newGuesses.length,
          difficulty,
        },
      ]);
      updateProgress("wordle", {
        win: true,
        difficulty: difficulty,
        word: targetWord, // Send the word to track in completed words
      }); // Send win data to backend
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameState("lost");
      // Record this game's performance
      setPerformanceHistory((prev) => [
        ...prev,
        {
          won: false,
          guesses: MAX_GUESSES,
          difficulty,
        },
      ]);
      updateProgress("wordle", { loss: true, difficulty: difficulty }); // Send loss data to backend
    }

    setCurrentGuess(""); // Clear input
  };

  // Allow submitting with Enter key
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && gameState === "playing") {
      handleGuessSubmit();
    }
  };

  const fetchHint = async () => {
    if (!targetWord || hint || loadingHint) return; // Don't fetch if already have one or loading
    setLoadingHint(true);
    setError("");
    try {
      const fetchedHint = await generateWordHint(targetWord);
      setHint(fetchedHint);
    } catch (err) {
      console.error("Failed to fetch hint:", err);
      setError("Could not fetch hint.");
      setHint("Hint generation failed."); // Provide fallback
    } finally {
      setLoadingHint(false);
    }
  };

  // Evaluate guess against the target word
  const evaluateGuess = (guess, target) => {
    const evaluation = Array(wordLength).fill("absent");
    const targetLetters = target.split("");
    const guessLetters = guess.split("");
    const usedTargetIndices = new Set();

    // First pass: Check for correct letters
    for (let i = 0; i < wordLength; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        evaluation[i] = "correct";
        usedTargetIndices.add(i);
      }
    }

    // Second pass: Check for present letters
    for (let i = 0; i < wordLength; i++) {
      if (evaluation[i] !== "correct") {
        for (let j = 0; j < wordLength; j++) {
          if (
            !usedTargetIndices.has(j) &&
            guessLetters[i] === targetLetters[j]
          ) {
            evaluation[i] = "present";
            usedTargetIndices.add(j);
            break; // Found a match, move to the next guess letter
          }
        }
      }
    }
    return evaluation;
  };

  // Analyze player performance and adjust difficulty
  useEffect(() => {
    if (gameState !== "playing" && performanceHistory.length >= 3) {
      // Only assess after we have a few games
      const recentGames = performanceHistory.slice(-3);
      const winRate =
        recentGames.filter((game) => game.won).length / recentGames.length;
      const avgGuesses =
        recentGames.reduce((sum, game) => sum + game.guesses, 0) /
        recentGames.length;

      console.log(
        `Wordle performance analysis - Win rate: ${winRate}, Avg guesses: ${avgGuesses}`
      );

      // Increase difficulty if player is doing well
      if (winRate > 0.7 && avgGuesses < 3) {
        if (difficulty === "easy") {
          setShouldIncreaseDifficulty(true);
          console.log("Player performing well, suggesting medium difficulty");
        } else if (difficulty === "medium") {
          setShouldIncreaseDifficulty(true);
          console.log(
            "Player performing very well, suggesting hard difficulty"
          );
        }
      }
      // Decrease difficulty if player is struggling
      else if (winRate < 0.3 && avgGuesses > 4) {
        if (difficulty === "hard") {
          setShouldDecreaseDifficulty(true);
          console.log("Player struggling, suggesting medium difficulty");
        } else if (difficulty === "medium") {
          setShouldDecreaseDifficulty(true);
          console.log("Player really struggling, suggesting easy difficulty");
        }
      }
    }
  }, [gameState, performanceHistory, difficulty]);

  // Handle the dynamic difficulty change
  const handleDifficultyChange = (newDifficulty) => {
    updateProgress("wordle", { difficulty: newDifficulty });
    setDifficulty(newDifficulty);
    startNewGame(newDifficulty);
    // Reset the suggestion flags
    setShouldIncreaseDifficulty(false);
    setShouldDecreaseDifficulty(false);
    setShowDifficultySelector(false);
  };

  // Function to render the difficulty selector
  const renderDifficultySelector = () => {
    return (
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Select Difficulty</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleDifficultyChange("easy")}
            className={`px-4 py-2 rounded ${
              difficulty === "easy"
                ? "bg-green-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Easy (4 letters)
          </button>
          <button
            onClick={() => handleDifficultyChange("medium")}
            className={`px-4 py-2 rounded ${
              difficulty === "medium"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Medium (5 letters)
          </button>
          <button
            onClick={() => handleDifficultyChange("hard")}
            className={`px-4 py-2 rounded ${
              difficulty === "hard"
                ? "bg-red-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Hard (6 letters)
          </button>
        </div>
      </div>
    );
  };

  // Function to render the guess grid
  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < MAX_GUESSES; i++) {
      const currentEval = evaluations[i];
      const currentWord =
        guesses[i] ||
        (i === guesses.length && gameState === "playing" ? currentGuess : ""); // Show current typing in active row
      const cells = [];
      for (let j = 0; j < wordLength; j++) {
        const letter = currentWord[j] || "";
        let cellClass =
          "border border-gray-400 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold uppercase";
        if (currentEval) {
          const status = currentEval[j];
          if (status === "correct")
            cellClass += " bg-green-500 text-white border-green-500";
          else if (status === "present")
            cellClass += " bg-yellow-500 text-white border-yellow-500";
          else cellClass += " bg-gray-500 text-white border-gray-500";
        } else if (letter) {
          cellClass += " border-gray-700"; // Styling for currently typed letters
        }

        cells.push(
          <div key={j} className={cellClass}>
            {letter}
          </div>
        );
      }
      rows.push(
        <div
          key={i}
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))`,
          }}
        >
          {cells}
        </div>
      );
    }
    return <div className="grid gap-1 mb-4">{rows}</div>;
  };

  // Render Keyboard (Example)
  const renderKeyboard = () => {
    const keysLayout = [
      "qwertyuiop".split(""),
      "asdfghjkl".split(""),
      ["Enter", ..."zxcvbnm".split(""), "Backspace"],
    ];

    const handleKeyPress = (key) => {
      if (gameState !== "playing") return;

      if (key === "Enter") {
        handleGuessSubmit();
      } else if (key === "Backspace") {
        setCurrentGuess((cg) => cg.slice(0, -1));
      } else if (currentGuess.length < wordLength && /^[a-z]$/.test(key)) {
        setCurrentGuess((cg) => cg + key);
      }
    };

    return (
      <div className="space-y-1 my-4">
        {keysLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center space-x-1">
            {row.map((key) => {
              const status = keyboardStatus[key];
              let baseClass =
                "h-10 sm:h-12 flex items-center justify-center rounded font-semibold uppercase cursor-pointer transition-colors duration-150 ease-in-out";
              let statusClass = " bg-gray-300 hover:bg-gray-400 text-gray-800"; // Default

              if (status === "correct")
                statusClass = " bg-green-500 text-white";
              else if (status === "present")
                statusClass = " bg-yellow-500 text-white";
              else if (status === "absent")
                statusClass = " bg-gray-600 text-white opacity-60";

              let widthClass =
                key.length > 1 ? "px-2 sm:px-3 flex-grow" : "w-8 sm:w-10"; // Wider for Enter/Backspace

              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`${baseClass} ${statusClass} ${widthClass}`}
                >
                  {key === "Backspace" ? "⌫" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (gameState === "loading") {
    return (
      <div className="flex justify-center items-center">
        <LoadingSpinner /> <p className="ml-2">Generating word...</p>
      </div>
    );
  }
  if (gameState === "error") {
    return (
      <div className="text-center text-red-500">
        {error}{" "}
        <button
          onClick={() => startNewGame(difficulty)}
          className="ml-2 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (gameState === "won") {
    return (
      <div className="text-center text-green-600 font-bold text-xl mt-4">
        <p>Congratulations! You guessed the word: {targetWord.toUpperCase()}</p>

        {shouldIncreaseDifficulty && (
          <div className="mt-2 p-3 bg-blue-100 rounded-lg text-blue-800 text-base">
            <p>You're doing great! Want to try a harder difficulty?</p>
            <button
              onClick={() =>
                handleDifficultyChange(
                  difficulty === "easy" ? "medium" : "hard"
                )
              }
              className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Try {difficulty === "easy" ? "Medium" : "Hard"}
            </button>
          </div>
        )}

        <button
          onClick={() => startNewGame(difficulty)}
          className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Play Again?
        </button>
      </div>
    );
  }

  if (gameState === "lost") {
    return (
      <div className="text-center text-red-600 font-bold text-xl mt-4">
        <p>Game Over! The word was: {targetWord.toUpperCase()}</p>

        {shouldDecreaseDifficulty && (
          <div className="mt-2 p-3 bg-blue-100 rounded-lg text-blue-800 text-base">
            <p>This seems challenging. Want to try an easier difficulty?</p>
            <button
              onClick={() =>
                handleDifficultyChange(
                  difficulty === "hard" ? "medium" : "easy"
                )
              }
              className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Try {difficulty === "hard" ? "Medium" : "Easy"}
            </button>
          </div>
        )}

        <button
          onClick={() => startNewGame(difficulty)}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Play Again?
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 capitalize">
        WordleAI ({difficulty})
      </h2>

      <button
        onClick={() => setShowDifficultySelector(!showDifficultySelector)}
        className="mb-4 text-blue-500 underline"
      >
        {showDifficultySelector
          ? "Hide Difficulty Options"
          : "Change Difficulty"}
      </button>

      {showDifficultySelector && renderDifficultySelector()}

      {renderGrid()}

      {gameState === "playing" && (
        <>
          <input
            type="text"
            value={currentGuess}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown} // Add Enter key listener
            maxLength={wordLength}
            className="border-2 border-gray-400 rounded px-3 py-2 mb-3 w-full text-center uppercase tracking-widest text-xl"
            placeholder={`Enter ${wordLength}-letter word`}
            disabled={gameState !== "playing"}
            autoFocus
          />
          <button
            onClick={handleGuessSubmit}
            disabled={
              currentGuess.length !== wordLength || gameState !== "playing"
            }
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Guess
          </button>
          {/* Hint Button */}
          {guesses.length >= 3 &&
            !hint && ( // Show hint button after 3 guesses
              <button
                onClick={fetchHint}
                disabled={loadingHint}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 mb-4"
              >
                {loadingHint ? "Getting hint..." : "Need a hint?"}
              </button>
            )}
          {hint && <p className="text-gray-600 italic mb-4">Hint: {hint}</p>}
          {renderKeyboard()} {/* Add the virtual keyboard */}
        </>
      )}
    </div>
  );
}

export default WordleGame;
