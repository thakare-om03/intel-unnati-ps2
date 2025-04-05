@echo off
echo Setting up ChromaDB for GenAI Learning Games
echo.

REM Create a Python virtual environment
echo Creating Python virtual environment...
python -m venv chromadb-env

REM Activate the virtual environment
echo Activating virtual environment...
call chromadb-env\Scripts\activate

REM Install ChromaDB
echo Installing ChromaDB...
pip install chromadb

REM Create a startup script for ChromaDB
echo @echo off > start-chromadb.bat
echo echo Starting ChromaDB server... >> start-chromadb.bat
echo call chromadb-env\Scripts\activate >> start-chromadb.bat
echo chroma run --host 0.0.0.0 --port 8000 >> start-chromadb.bat

echo.
echo Setup complete! Run start-chromadb.bat to start the ChromaDB server.
