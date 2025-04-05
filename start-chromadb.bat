@echo off 
echo Starting ChromaDB server... 
call chromadb-env\Scripts\activate 
chroma run --host 0.0.0.0 --port 8000 
