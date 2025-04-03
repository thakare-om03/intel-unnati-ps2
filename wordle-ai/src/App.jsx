import { useState, useEffect } from 'react';
import { words } from './words';
import { getPerformance, updatePerformance } from './performance';
import { wordImages } from './images';

function App() {
  const [difficulty, setDifficulty] = useState(null);
  const [wordLength, setWordLength] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState('playing'); // 'playing', 'hint', 'won', 'lost'

  // Start a new game when difficulty is selected
  useEffect(() => {
    if (difficulty) {
      const length = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
      setWordLength(length);

      // Get player performance
      const performance = getPerformance();
      const winStreak = performance.streak;

      // AI-driven word selection
      let wordList;
      if (winStreak >= 2) {
        wordList = words.hardWords[difficulty];
      } else if (winStreak <= -2) {
        wordList = words[difficulty];
      } else {
        wordList = words[difficulty];
      }

      const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
      setTargetWord(randomWord);
      setGuesses([]);
      setCurrentGuess('');
      setGameState('playing');
    }
  }, [difficulty]);

  // Handle guess submission
  const handleGuess = () => {
    if (currentGuess.length !== wordLength) {
      alert(`Please enter a ${wordLength}-letter word!`);
      return;
    }
    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === targetWord) {
      setGameState('won');
      updatePerformance(true);
    } else if (newGuesses.length === 6 && gameState === 'playing') {
      setGameState('hint'); // Show image hint after 6 tries
    } else if (newGuesses.length === 7 && gameState === 'hint') {
      setGameState('lost');
      updatePerformance(false);
    }
  };

  // Get letter status (correct, present, absent)
  const getLetterStatus = (letter, pos) => {
    if (targetWord[pos] === letter) return 'bg-green-500';
    if (targetWord.includes(letter)) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">AI Wordle</h1>
      {!difficulty ? (
        <div className="space-y-4">
          <h2 className="text-2xl text-gray-700">Select Difficulty</h2>
          <button
            onClick={() => setDifficulty('easy')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Easy (4 letters)
          </button>
          <button
            onClick={() => setDifficulty('medium')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Medium (5 letters)
          </button>
          <button
            onClick={() => setDifficulty('hard')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Hard (6 letters)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl text-gray-700">Difficulty: {difficulty}</h2>
          {/* Display guesses */}
          {guesses.map((guess, index) => (
            <div key={index} className="flex space-x-2 justify-center">
              {guess.split('').map((letter, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 flex items-center justify-center text-white font-bold text-xl rounded ${getLetterStatus(
                    letter,
                    i
                  )}`}
                >
                  {letter.toUpperCase()}
                </div>
              ))}
            </div>
          ))}
          {/* Show image hint after 6 tries */}
          {gameState === 'hint' && (
            <div className="space-y-2">
              <p className="text-lg text-gray-700">Here’s a hint:</p>
              <img
                src={wordImages[targetWord]}
                alt={`Hint for ${targetWord}`}
                className="w-64 h-40 rounded-lg"
              />
            </div>
          )}
          {/* Input for current guess */}
          {(gameState === 'playing' || gameState === 'hint') && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value.toLowerCase())}
                maxLength={wordLength}
                className="px-4 py-2 border rounded-lg text-center"
                placeholder={`Enter a ${wordLength}-letter word`}
              />
              <button
                onClick={handleGuess}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Guess
              </button>
            </div>
          )}
          {/* Game result */}
          {gameState === 'won' && (
            <p className="text-xl text-green-600">Congratulations! You won!</p>
          )}
          {gameState === 'lost' && (
            <p className="text-xl text-red-600">
              Game Over! The word was: {targetWord.toUpperCase()}
            </p>
          )}
          {/* Restart button */}
          {(gameState === 'won' || gameState === 'lost') && (
            <button
              onClick={() => setDifficulty(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;