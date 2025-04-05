import axios from "axios";

// Groq API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-70b-8192"; // Using Llama 3 model for fact-checking

/**
 * Validates quiz questions for factual accuracy using Groq API
 * @param {Array} questions - Array of quiz question objects
 * @returns {Promise<Array>} - Array of validated/corrected quiz questions
 */
export const factCheckQuizQuestions = async (questions, apiKey) => {
  if (!apiKey) {
    console.warn("Groq API key is missing. Skipping fact-checking.");
    return questions;
  }

  try {
    console.log("Fact-checking quiz questions with Groq API - batch mode");

    // Format all questions into a single prompt
    const questionsJson = JSON.stringify(questions, null, 2);

    const prompt = `
You are a highly knowledgeable fact-checking assistant. Your task is to review and verify the factual accuracy of the following quiz questions and their answers.

Questions to verify:
${questionsJson}

For each question, please verify:
1. Is the question factually accurate?
2. Are all options plausible?
3. Is the marked correct answer truly correct?

If there are ANY factual errors, please provide corrections for those specific questions.

Respond in the following JSON format ONLY:
{
  "correctedQuestions": [
    {
      "originalIndex": 0,
      "question": "corrected question text if needed",
      "options": ["option1", "option2", "option3", "option4"],
      "correctIndex": 0/1/2/3
    },
    // Include ONLY questions that needed corrections
  ]
}

If all questions are factually accurate, return an empty "correctedQuestions" array.
`;

    // Call Groq API with all questions at once
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Lower temperature for more deterministic, factual responses
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const responseContent = response.data?.choices[0]?.message?.content;

    if (responseContent) {
      try {
        const validationResult = JSON.parse(responseContent);
        const correctedQuestions = validationResult.correctedQuestions || [];

        if (correctedQuestions.length > 0) {
          console.log(
            `Found ${correctedQuestions.length} questions that need correction`
          );

          // Apply corrections
          const validatedQuestions = [...questions]; // Create a copy to modify
          correctedQuestions.forEach((correction) => {
            const index = correction.originalIndex;
            if (index >= 0 && index < validatedQuestions.length) {
              console.log(
                `Correcting question #${index + 1}: "${
                  questions[index].question
                }"`
              );
              validatedQuestions[index] = {
                question: correction.question,
                options: correction.options,
                correctIndex: correction.correctIndex,
              };
            }
          });

          return validatedQuestions;
        } else {
          console.log(
            "All questions passed fact-checking with no corrections needed"
          );
        }
      } catch (parseError) {
        console.error("Failed to parse Groq API response:", parseError);
      }
    }

    // If we reach here, either no corrections were needed or there was a parsing error
    return questions;
  } catch (error) {
    console.error("Error during fact-checking with Groq API:", error.message);
    // Return original questions in case of error
    return questions;
  }
};

/**
 * Validates a single string of factual information
 * @param {string} content - The content to validate
 * @param {string} apiKey - The Groq API key
 * @returns {Promise<{isFactuallyCorrect: boolean, correctedContent: string}>}
 */
export const factCheckContent = async (content, apiKey) => {
  if (!apiKey || !content) {
    return { isFactuallyCorrect: true, correctedContent: content };
  }

  try {
    const prompt = `
Please verify if the following information is factually correct:
"${content}"

If it contains factual errors, please provide a corrected version.
Respond in JSON format:
{
  "isFactuallyCorrect": true/false,
  "correctedContent": "corrected information if needed"
}
`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const responseContent = response.data?.choices[0]?.message?.content;

    if (responseContent) {
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        console.error("Failed to parse Groq API response:", parseError);
      }
    }

    return { isFactuallyCorrect: true, correctedContent: content };
  } catch (error) {
    console.error("Error during content fact-checking:", error.message);
    return { isFactuallyCorrect: true, correctedContent: content };
  }
};
