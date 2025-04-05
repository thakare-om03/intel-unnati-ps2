import { ChromaClient } from "chromadb";

// Initialize ChromaDB client
const client = new ChromaClient();

/**
 * Initialize collections for different game content
 */
export async function initializeCollections() {
  try {
    // Create collections for different types of game content
    const quizCollection = await client.createCollection({
      name: "quiz_questions",
      metadata: { description: "Quiz questions and answers" },
    });

    const wordleCollection = await client.createCollection({
      name: "wordle_words",
      metadata: { description: "Words and hints for Wordle game" },
    });

    console.log("ChromaDB collections initialized");
    return { quizCollection, wordleCollection };
  } catch (error) {
    console.error("Error initializing ChromaDB:", error);
    return null;
  }
}

/**
 * Store successful quiz questions for future retrieval
 * @param {Object} quizData - Quiz data with questions and answers
 * @param {string} topic - Quiz topic
 * @param {string} difficulty - Quiz difficulty
 */
export async function storeQuizQuestions(quizData, topic, difficulty) {
  try {
    const collection = await client.getCollection("quiz_questions");

    // Process each question
    for (let i = 0; i < quizData.questions.length; i++) {
      const question = quizData.questions[i];
      const correctAnswer = question.options[question.correctIndex];

      // Store the question with metadata
      await collection.add({
        ids: [`${topic}-${difficulty}-${Date.now()}-${i}`],
        documents: [question.question],
        metadatas: [
          {
            topic,
            difficulty,
            options: JSON.stringify(question.options),
            correctAnswer,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    console.log(
      `Stored ${quizData.questions.length} quiz questions for topic: ${topic}`
    );
  } catch (error) {
    console.error("Error storing quiz questions:", error);
  }
}

/**
 * Retrieve similar questions to help generate better quizzes
 * @param {string} topic - Quiz topic
 * @param {string} difficulty - Quiz difficulty
 * @returns {Array} - Array of question data
 */
export async function retrieveSimilarQuestions(topic, difficulty) {
  try {
    const collection = await client.getCollection("quiz_questions");

    // Query for similar questions
    const results = await collection.query({
      queryTexts: [topic],
      nResults: 5,
      where: { difficulty },
    });

    // Format results for AI prompt enhancement
    return results.documents.map((doc, index) => {
      const metadata = results.metadatas[index];
      return {
        question: doc,
        options: JSON.parse(metadata.options),
        correctAnswer: metadata.correctAnswer,
      };
    });
  } catch (error) {
    console.error("Error retrieving similar questions:", error);
    return [];
  }
}

/**
 * Store Wordle words and hints for future reference
 * @param {string} word - The target word
 * @param {string} hint - The generated hint
 * @param {string} difficulty - Word difficulty
 */
export async function storeWordleWord(word, hint, difficulty) {
  try {
    const collection = await client.getCollection("wordle_words");

    await collection.add({
      ids: [`${word}-${Date.now()}`],
      documents: [word],
      metadatas: [
        {
          hint,
          difficulty,
          length: word.length,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    console.log(`Stored Wordle word: ${word}`);
  } catch (error) {
    console.error("Error storing Wordle word:", error);
  }
}
