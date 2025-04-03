export const getPerformance = () => {
    const performance = localStorage.getItem('wordlePerformance');
    return performance ? JSON.parse(performance) : { wins: 0, losses: 0, streak: 0 };
  };
  
  export const updatePerformance = (won) => {
    const performance = getPerformance();
    if (won) {
      performance.wins += 1;
      performance.streak = performance.streak >= 0 ? performance.streak + 1 : 1;
    } else {
      performance.losses += 1;
      performance.streak = performance.streak <= 0 ? performance.streak - 1 : -1;
    }
    localStorage.setItem('wordlePerformance', JSON.stringify(performance));
    return performance;
  };