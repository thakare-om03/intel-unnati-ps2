@echo off
echo Starting GenAI Learning Games...
echo.

start cmd /k "call start-chromadb.bat"
echo Waiting for ChromaDB to start...
timeout /t 5

start cmd /k "node server.js"
start cmd /k "npm run dev"

echo.
echo ChromaDB: http://localhost:8000
echo Server: http://localhost:3001
echo Frontend: http://localhost:5173