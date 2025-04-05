# GenAI Interactive Learning Games

An AI-powered educational platform featuring adaptive learning games with real-time progress tracking and dynamic content generation.

## 🚀 Features

- **WordleAI**: AI-generated word puzzles with adaptive difficulty
  - Dynamic hint generation
  - Player progress tracking
  - Streak system and badges

- **Adaptive Quiz Engine**
  - AI-generated questions with Groq API fact-checking
  - Difficulty adjustment based on performance
  - ChromaDB-powered question similarity search

- **Learning Analytics**
  - Real-time leaderboard
  - Skill progression tracking
  - Performance-based badge system

## 🛠 Technical Stack

### Backend
- **Runtime**: Node.js/Express
- **Database**: SQLite with Sequelize ORM
- **Vector DB**: ChromaDB for semantic search
- **AI Integration**:
  - Ollama (local models)
  - Groq API (Llama 3 70B for fact-checking)
  - Hugging Face/OpenRouter APIs

### Frontend
- **Framework**: React 19
- **Styling**: TailwindCSS
- **State Management**: React Router, Context API
- **Visualization**: Dynamic SVG components

## ⚙️ Prerequisites

- Node.js 18+
- Python 3.8+ (for ChromaDB)
- Ollama (optional for local AI)
- ChromaDB server

## 🛠 Installation

1. Clone repository:
```
git clone https://github.com/thakare-om03/intel-unnati-ps2.git
cd intel-unnati-ps2
```

2. Install dependencies:
```
npm install
```

3. Set up ChromaDB:
```
setup-chromadb.bat
```

4. Configure environment:
```
cp .env
# Add your API keys in .env
```

## 🖥 Running the Application

Start services in order:

1. ChromaDB vector database:
```
start-chromadb.bat
```

2. Backend server:
```
node server.js
```

3. Frontend development:
```
npm run dev
```

Or use the combined start script:
```
start.bat
```

Access endpoints:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- ChromaDB: `http://localhost:8000`

## 🌐 Project Structure

```
intel-unnati-ps2/
├── server.js               # Express backend entry
├── frontend/               # React application
├── models/                 # Sequelize database models
├── routes/                 # API endpoints
├── utils/                  # AI & database utilities
├── chromadb/               # Vector database config
└── public/                 # Static assets
```

## 🔒 Environment Variables

```
PORT=3001
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
VITE_GROQ_API_KEY=your_key_here
```

## 📈 Advanced Features

### ChromaDB Integration
- Stores quiz question embeddings
- Semantic search for question generation
- Word/hint vector storage
```
# Query similar questions
curl http://localhost:3001/api/embeddings/similar?topic=biology
```

### Groq Fact-Checking
- Real-time quiz answer validation
- Error correction using Llama 3 70B
- Configurable through `.env`

## 🚀 Deployment

1. Production build:
```
npm run build
```

2. Use PM2 for process management:
```
pm2 start server.js
pm2 start start-chromadb.bat
```