import { useState, useEffect } from "react";
import { generateQuiz } from "../utils/aiUtils";
import LoadingSpinner from "./LoadingSpinner";

function Quiz({ topic, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const quizData = await generateQuiz(topic, "intermediate");

      if (quizData && quizData.questions) {
        setQuestions(quizData.questions);
      } else {
        // Fallback to simple questions if API fails
        setQuestions([
          {
            question: `What is a key characteristic of ${topic}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 0,
          },
          {
            question: `Name a famous example related to ${topic}:`,
            options: ["Example 1", "Example 2", "Example 3", "Example 4"],
            correctIndex: 1,
          },
          {
            question: `How does ${topic} impact modern society?`,
            options: ["Impact 1", "Impact 2", "Impact 3", "Impact 4"],
            correctIndex: 2,
          },
        ]);
      }
    } catch (error) {
      console.error("Quiz generation failed:", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [topic]);

  const handleAnswer = (optionIndex) => {
    if (isAnswered) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === questions[currentQuestion].correctIndex;
    if (isCorrect) {
      setScore(score + 1);
    }

    // Wait a moment before proceeding to next question
    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        // Quiz completed, calculate final score
        const finalScore = score + (isCorrect ? 1 : 0);
        onComplete(finalScore);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoadingSpinner />
        <p className="mt-4 text-lg text-gray-700">
          Generating quiz about {topic}...
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-lg font-medium text-gray-700 text-center">
        Failed to generate quiz. Please try again.
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg mx-auto">
      <div className="mb-4">
        <span className="text-sm font-medium text-gray-500">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className="bg-indigo-600 h-2 rounded-full"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        {question.question}
      </h2>

      <div className="flex flex-col gap-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={isAnswered}
            className={`w-full text-left p-3 rounded ${
              isAnswered
                ? index === question.correctIndex
                  ? "bg-green-100 border-2 border-green-500"
                  : selectedOption === index
                  ? "bg-red-100 border-2 border-red-500"
                  : "bg-white border border-gray-300"
                : "bg-white border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-4 text-right">
        <span className="font-medium text-gray-700">Score: {score}</span>
      </div>
    </div>
  );
}

export default Quiz;
