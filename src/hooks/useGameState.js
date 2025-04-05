import { useState } from "react";

export default function useGameState() {
  const [gridSize, setGridSize] = useState(3);
  const [performance, setPerformance] = useState({ score: 0, time: 0 });

  const updatePerformance = (time, quizScore) => {
    setPerformance((prev) => ({
      score: prev.score + (quizScore || 0),
      time: prev.time + (time || 0),
    }));
  };

  const increaseDifficulty = () => {
    setGridSize((prev) => Math.min(prev + 1, 6));
  };

  return { gridSize, performance, updatePerformance, increaseDifficulty };
}