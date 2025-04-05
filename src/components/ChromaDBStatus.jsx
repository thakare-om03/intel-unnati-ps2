import { useState, useEffect } from "react";
import axios from "axios";

const ChromaDBStatus = () => {
  const [status, setStatus] = useState({
    checking: true,
    available: false,
    quizCollectionExists: false,
    wordleCollectionExists: false,
    message: "Checking ChromaDB status...",
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/api/chromadb/status"
        );
        setStatus({
          checking: false,
          ...response.data,
        });
      } catch (error) {
        setStatus({
          checking: false,
          available: false,
          message: "Error connecting to server to check ChromaDB status",
        });
      }
    };

    checkStatus();
  }, []);

  return (
    <div className="p-4 mb-6 bg-white rounded-lg shadow">
      <h2 className="font-semibold text-lg mb-2">ChromaDB Status</h2>

      <div className="flex items-center mb-1">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            status.checking
              ? "bg-yellow-500"
              : status.available
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        ></div>
        <span className="font-medium">
          {status.checking
            ? "Checking connection..."
            : status.available
            ? "Connected"
            : "Not Connected"}
        </span>
      </div>

      {status.available && (
        <div className="mt-2">
          <div className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Quiz Collection:</span>{" "}
            {status.quizCollectionExists ? "Available" : "Not Available"}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Wordle Collection:</span>{" "}
            {status.wordleCollectionExists ? "Available" : "Not Available"}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-600 mt-2">{status.message}</p>

      {!status.available && !status.checking && (
        <div className="mt-3 text-sm">
          <p className="text-red-600">
            ChromaDB server is not running. Please start it with:
          </p>
          <code className="block bg-gray-100 p-2 mt-1 rounded">
            start-chromadb.bat
          </code>
        </div>
      )}
    </div>
  );
};

export default ChromaDBStatus;
