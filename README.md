# GenAI Interactive Learning Games

An educational game platform using Generative AI to create dynamic content, challenges, and adaptive learning experiences.

## Features

- **WordleAI**: AI-generated word puzzles that adapt to your vocabulary level
- **Jigsaw Challenges**: Visual puzzles with educational content
- **Adaptive Quizzes**: Questions that adjust difficulty based on performance

## Technical Architecture

- **Backend**: Node.js/Express
- **Frontend**: React with TailwindCSS
- **AI Models**: Integration with Ollama (local models) and OpenRouter/Hugging Face APIs
- **Database**: SQLite with Sequelize ORM

## Prerequisites

- Node.js 14+ and npm
- Ollama (optional, for local AI model support)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/intel-unnati-ps2.git
   cd intel-unnati-ps2
   ```

2. Install dependencies:

   ```bash
   # Install server dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. Set environment variables:
   - Copy `.env.example` to `.env` and set your API keys

## Running the Application

### Option 1: Using start.bat (Windows)

```bash
start.bat
```

### Option 2: Manual startup

```bash
# Terminal 1 - Start the backend
npm run dev:server

# Terminal 2 - Start the frontend
npm run dev:frontend
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
intel-unnati-ps2/
├── frontend/              # React frontend application
├── models/               # Sequelize database models
├── routes/              # Express API routes
├── server.js            # Express server entry point
└── start.bat            # Windows startup script
```

## Environment Variables

```env
PORT=3001                # Backend server port
USE_OLLAMA=true         # Enable/disable Ollama integration
OLLAMA_BASE_URL=        # Ollama API URL
OLLAMA_MODEL=           # Default Ollama model
HUGGING_FACE_API_KEY=   # Hugging Face API key
OPENROUTER_API_KEY=     # OpenRouter API key
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request
