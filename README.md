# AI Butler Hotel Concierge

A Next.js and FastAPI-powered AI Concierge application for hotel services.

## Overview

This application provides an AI-powered chat interface that allows hotel guests to inquire about various services offered by the hotel, including:

- Transportation services
- Dining options
- Spa services
- Tours and activities
- Entertainment
- Room service

The AI concierge fetches real-time service data from the Supabase database via the Next.js API, and provides formatted responses based on the user's queries.

## Project Structure

- `app/` - Next.js application
- `backend/` - FastAPI backend for AI processing
- `components/` - React components for the UI

## Setup and Installation

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+ with pip
- Supabase account (for database)

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Install backend dependencies:
   ```
   cd backend
   pip install fastapi uvicorn langchain langchain-openai langgraph pydantic requests
   ```

## Running the Application

### 1. Start the Backend

On Windows, use the provided batch file:

```
cd backend
start_backend.bat
```

Alternatively, you can run:

```
cd backend
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

The FastAPI backend will run on http://127.0.0.1:8000

### 2. Start the Frontend

In a separate terminal, run:

```
npm run dev
```

The Next.js application will run on http://localhost:3000

### 3. Access the Concierge

Open your browser and navigate to:

```
http://localhost:3000/concierge
```

## Troubleshooting

### Backend Connection Issues

If you see a connection error in the chat interface:

1. Make sure the backend server is running
2. Check that your `.env.local` file has the correct BACKEND_URL set to `http://127.0.0.1:8000`
3. If using IPv6, you might need to change the URL to `http://[::1]:8000`

### Python Environment Issues

If you encounter Python-related errors:

1. Ensure you have Python 3.8+ installed
2. Install all required packages: `pip install fastapi uvicorn langchain langchain-openai langgraph pydantic requests`
3. If you have multiple Python installations, specify the correct one in the commands

## License

MIT 