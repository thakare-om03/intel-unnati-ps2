const BADGE_INFO = {
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
  "puzzle-solver": {
    icon: "🧩",
    name: "Puzzle Solver",
    description: "Complete 3 jigsaw puzzles",
  },
  "puzzle-expert": {
    icon: "🧠",
    name: "Puzzle Expert",
    description: "Complete 10 jigsaw puzzles",
  },
  "quiz-master": {
    icon: "🎓",
    name: "Quiz Master",
    description: "Earn 50 points in quizzes",
  },
  genius: {
    icon: "🌟",
    name: "Learning Genius",
    description: "Excel in all game types",
  },
};

function BadgeDisplay({ badges }) {
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badgeId) => {
        const badge = BADGE_INFO[badgeId] || {
          icon: "❓",
          name: badgeId,
          description: "Mystery badge",
        };
        return (
          <div
            key={badgeId}
            className="flex flex-col items-center bg-indigo-100 p-3 rounded-lg w-24"
            title={badge.description}
          >
            <span className="text-2xl mb-1">{badge.icon}</span>
            <span className="text-xs text-center font-medium text-indigo-800">
              {badge.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default BadgeDisplay;
