/**
 * Utility for distributing questions across difficulty levels
 * @param totalQuestions Total number of questions to distribute
 * @param levels Number of difficulty levels to distribute across (default: 3)
 * @returns An object mapping difficulty levels to question counts
 */
export function distributeQuestions(
  totalQuestions: number, 
  levels: number = 3
): Record<number, number> {
  // Validate input
  if (totalQuestions < 0) {
    throw new Error('Total questions must be a non-negative number');
  }

  // Ensure levels is between 1 and 5
  levels = Math.max(1, Math.min(levels, 5));

  // Calculate base distribution
  const questionsPerLevel = Math.floor(totalQuestions / levels);
  const remainder = totalQuestions % levels;

  // Distribute questions
  const distribution: Record<number, number> = {};
  
  for (let i = 1; i <= levels; i++) {
    // Base number of questions for each level
    distribution[i] = questionsPerLevel;

    // Distribute remainder to initial levels
    if (i <= remainder) {
      distribution[i]++;
    }
  }

  return distribution;
}

/**
 * Validate the distribution of questions
 * @param distribution Question distribution object
 * @returns Boolean indicating if distribution is valid
 */
export function validateQuestionDistribution(
  distribution: Record<number, number>
): boolean {
  const totalQuestions = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  return Object.keys(distribution).every(key => 
    Number(key) >= 1 && Number(key) <= 5 && distribution[Number(key)] >= 0
  ) && totalQuestions > 0;
}
