import { useState, useEffect } from "react";
import { generateQuiz } from "../utils/aiUtils";
import { getRecommendedDifficulty } from "../utils/progressUtils";
import LoadingSpinner from "../components/LoadingSpinner";

function QuizGame({ updateProgress }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState("input"); // input, loading, playing, completed
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [difficultyFeedback, setDifficultyFeedback] = useState(null);

  // Set recommended difficulty on component mount
  useEffect(() => {
    const recommendedDifficulty = getRecommendedDifficulty("quiz");
    setDifficulty(recommendedDifficulty);
  }, []);

  // Track question response time
  useEffect(() => {
    if (gameState === "playing" && !isAnswered) {
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestion, gameState, isAnswered]);

  const handleStartQuiz = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic");
      return;
    }

    setGameState("loading");
    setResponseTimes([]);

    try {
      const quiz = await generateQuiz(topic, difficulty);

      if (quiz && quiz.questions && quiz.questions.length > 0) {
        setQuizData(quiz);
        setCurrentQuestion(0);
        setScore(0);
        setGameState("playing");
        setQuestionStartTime(Date.now());
      } else {
        alert(
          "Failed to generate quiz. Please try again or choose a different topic."
        );
        setGameState("input");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("Error generating quiz. Please try again later.");
      setGameState("input");
    }
  };

  const handleAnswer = (optionIndex) => {
    if (isAnswered) return;

    const responseTime = Date.now() - questionStartTime;
    setResponseTimes((prev) => [...prev, responseTime]);

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect =
      optionIndex === quizData.questions[currentQuestion].correctIndex;

    if (isCorrect) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (currentQuestion < quizData.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        setGameState("completed");
        const finalScore = score + (isCorrect ? 1 : 0);
        const totalQuestions = quizData.questions.length;
        const scorePercentage = finalScore / totalQuestions;

        const avgResponseTime =
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        setPerformanceHistory((prev) => [
          ...prev,
          { scorePercentage, avgResponseTime, difficulty },
        ]);

        if (scorePercentage > 0.8 && difficulty !== "expert") {
          setDifficultyFeedback("increase");
        } else if (scorePercentage < 0.4 && difficulty !== "beginner") {
          setDifficultyFeedback("decrease");
        }

        updateProgress("quiz", {
          score: finalScore,
          totalQuestions,
          scorePercentage,
          difficulty,
        });
      }
    }, 1500);
  };

  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
    setDifficultyFeedback(null);
    updateProgress("quiz", { difficulty: newDifficulty });
  };

  const renderQuizContent = () => {
    if (!quizData || currentQuestion >= quizData.questions.length) {
      return null;
    }

    const question = quizData.questions[currentQuestion];

    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Question {currentQuestion + 1} of {quizData.questions.length}
        </h2>

        <div className="p-4 bg-indigo-50 rounded-lg mb-6">
          <p className="text-lg text-gray-800">{question.question}</p>
        </div>

        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={isAnswered}
              className={`w-full p-3 rounded-lg text-left transition ${
                isAnswered
                  ? index === question.correctIndex
                    ? "bg-green-100 border-2 border-green-500"
                    : selectedOption === index
                    ? "bg-red-100 border-2 border-red-500"
                    : "bg-gray-100 border border-gray-300"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Adaptive Quiz
      </h1>

      {gameState === "input" && (
        <div className="space-y-6">
          <p className="text-gray-700 text-center">
            Test your knowledge with an AI-generated quiz! Enter a topic to get
            started.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Astronomy, History, Biology"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartQuiz}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Start Quiz
            </button>
          </div>
        </div>
      )}

      {gameState === "loading" && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner />
          <p className="mt-4 text-gray-700">
            Generating quiz about "{topic}"...
          </p>
        </div>
      )}

      {gameState === "playing" && renderQuizContent()}

      {gameState === "completed" && (
        <div className="text-center">
          <div className="mb-6">
            <div className="text-5xl font-bold mb-2">
              {score}/{quizData.questions.length}
            </div>
            <p className="text-lg text-gray-700">
              {score === quizData.questions.length
                ? "Perfect score! Amazing job! 🎉"
                : score >= quizData.questions.length * 0.8
                ? "Great job! 👏"
                : score >= quizData.questions.length * 0.6
                ? "Good effort! 👍"
                : "Keep practicing! 💪"}
            </p>
          </div>

          {difficultyFeedback && (
            <div
              className={`p-4 mb-4 rounded-lg ${
                difficultyFeedback === "increase"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              <p className="mb-2">
                {difficultyFeedback === "increase"
                  ? "You're doing great! Want to try a more challenging quiz?"
                  : "This quiz was challenging. Want to try an easier difficulty?"}
              </p>
              <button
                onClick={() =>
                  handleDifficultyChange(
                    difficultyFeedback === "increase"
                      ? difficulty === "beginner"
                        ? "intermediate"
                        : "expert"
                      : difficulty === "expert"
                      ? "intermediate"
                      : "beginner"
                  )
                }
                className={`px-4 py-2 rounded text-white ${
                  difficultyFeedback === "increase"
                    ? "bg-green-500 hover:bg-green-700"
                    : "bg-blue-500 hover:bg-blue-700"
                }`}
              >
                Try{" "}
                {difficultyFeedback === "increase"
                  ? difficulty === "beginner"
                    ? "Intermediate"
                    : "Expert"
                  : difficulty === "expert"
                  ? "Intermediate"
                  : "Beginner"}{" "}
                difficulty
              </button>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => {
                setTopic("");
                setGameState("input");
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizGame;
