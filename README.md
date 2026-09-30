# Agent AI

Agent AI is a full-stack course project that turns an uploaded PDF into a grounded question-answering workspace. It combines document retrieval (RAG), optional OpenAI generation, a voice interface, and Model Context Protocol (MCP) tool use for optional web-search context.

The project follows the course architecture while adding validation, local no-key fallback behavior, isolated error handling, and server-side tests.

## What It Demonstrates

- Upload and index a PDF through a React and Express workflow
- Split PDF text into chunks for retrieval-augmented generation (RAG)
- Use OpenAI embeddings plus an in-memory vector store when `OPENAI_API_KEY` is configured
- Keep the app usable without paid keys through local keyword retrieval and transparent fallback answers
- Run an MCP server that exposes a `search_web` tool
- Run an MCP client that calls the tool from the Express backend
- Display document-grounded and MCP-assisted answers separately
- Support browser speech recognition and speech synthesis for voice conversation mode
- Test local retrieval behavior with Node's built-in test runner

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, Ant Design, Axios |
| Voice UI | react-speech-recognition, speak-tts |
| Backend | Node.js, Express, Multer, dotenv |
| PDF RAG | LangChain, PDFLoader, RecursiveCharacterTextSplitter |
| Vector Retrieval | OpenAI Embeddings, MemoryVectorStore |
| Tool Use | Model Context Protocol SDK, SerpAPI |
| Tests | node:test and node:assert |

## Architecture

```text
React browser UI
  | POST /upload, POST /chat
  v
Express server (server.js)
  |                         |
  |                         +-> chat-mcp.js -> MCP client
  |                                              |
  +-> chat.js -> PDF loader -> chunks -> RAG     v
                                             mcp-server.js
                                                  |
                                                  +-> search_web -> SerpAPI
```

For a chat request, the backend returns two independently generated fields:

1. `ragAnswer`: grounded in the uploaded PDF.
2. `mcpAnswer`: obtained through the MCP tool route and optionally summarized by an OpenAI model.

## Project Structure

```text
AgentAI/
+-- src/                            # React application
|   +-- App.js                      # State and page composition
|   +-- api.js                      # HTTP client for Express
|   +-- components/
|       +-- PdfUploader.js
|       +-- ChatComposer.js
|       +-- ConversationView.js
+-- server/                         # Express backend, not inside React src/
|   +-- server.js                   # HTTP routes and upload validation
|   +-- chat.js                     # PDF indexing and RAG
|   +-- local-rag.js                # No-key fallback retrieval
|   +-- mcp-server.js               # MCP search_web tool provider
|   +-- chat-mcp.js                 # MCP client and optional LLM summary
|   +-- uploads/                    # Runtime-only PDF storage; ignored by Git
|   +-- test/local-rag.test.js
+-- docs/                           # Chinese lesson-by-lesson tutorials
+-- postman/                        # API requests for backend testing
+-- package.json                    # React and combined development scripts
```

## Prerequisites

- Node.js 24 LTS or newer
- npm
- A modern browser for voice recognition
- Optional: OpenAI API key and SerpAPI key

## Run the Project

Install the React dependencies:

```powershell
cd Z:\Program\java\AgentAI
npm.cmd install --legacy-peer-deps
```

Install the Express and LangChain dependencies:

```powershell
cd server
npm.cmd install --legacy-peer-deps
cd ..
```

Start both applications:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`. The React application runs on port `3000`; Express runs on port `5001`.

## API Keys Are Optional

Copy `server/.env.example` to `server/.env` only when you want the paid/cloud capabilities:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
SERPAPI_KEY=your_key_here
PORT=5001
```

Without `OPENAI_API_KEY`:

- PDF upload and text extraction still work.
- Local keyword retrieval finds relevant chunks.
- Local keyword retrieval recognizes both English words and Chinese two-character terms.
- The UI clearly labels the result as local fallback mode.

Without `SERPAPI_KEY`:

- The MCP client/server route still runs.
- The `search_web` tool returns a clear configuration message instead of pretending to have live search results.

Never commit `server/.env`, real API keys, or private uploaded documents.
The server keeps only the currently active PDF; uploading a replacement or using
**Clear document** removes the prior runtime file.

## Course Compatibility Note

The course uses Create React App and LangChain package paths that are still useful for learning the architecture. Create React App and one LangChain community package currently report maintenance/deprecation notices during installation. The project keeps the course structure so you can follow the lessons, while upgrading Multer to the maintained 2.x upload middleware line.

## Test and Build

Run the server-side unit tests:

```powershell
npm.cmd run test:server
```

Build the React production bundle:

```powershell
npm.cmd run build
```

## API Summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Show server status and feature configuration |
| POST | `/upload` | Upload and index one PDF through form-data field `file` |
| GET / POST | `/chat` | Ask a question about the active PDF |
| DELETE | `/document` | Clear the active document session |

## Learning Guide

Read these files in order:

1. `docs/00-project-map.md`
2. `docs/01-lesson-46-express-rag.md`
3. `docs/02-lesson-47-react-ui.md`
4. `docs/03-lesson-48-voice-interface.md`
5. `docs/04-lesson-49-mcp.md`
6. `docs/05-run-test-debug.md`
