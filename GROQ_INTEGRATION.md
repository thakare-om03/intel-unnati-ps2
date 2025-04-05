# Groq API Integration for Quiz Fact-Checking

This project now integrates with Groq's API to ensure factual accuracy in quiz questions and answers.

## How It Works

1. When a quiz is generated, the questions and answers are sent to Groq's LLM API for verification
2. Groq's model checks each question and its answers for factual accuracy
3. If any inaccuracies are found, the model suggests corrections
4. The corrected questions are then provided to the user

## Configuration

To use this feature, set the `VITE_GROQ_API_KEY` environment variable in your `.env` file:

```
VITE_GROQ_API_KEY=your_groq_api_key_here
```

## Benefits

- **Enhanced Accuracy**: All quiz questions undergo fact-checking before being presented
- **Educational Integrity**: Users receive factually correct information
- **Reliable Learning**: Prevents misinformation in the learning process

## Technical Implementation

The fact-checking process uses Groq's Llama 3 70B model to verify information. The system:

1. Sends each question with its answers to the API
2. Processes the verification result
3. Applies corrections as needed
4. Returns the improved quiz content

## Limitations

- API rate limits may apply
- Fact-checking adds a slight delay to quiz generation
- Some extremely specialized topics might still contain inaccuracies

For more information on Groq's API, visit [https://console.groq.com](https://console.groq.com)
