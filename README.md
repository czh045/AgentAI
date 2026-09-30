# AgentAI

A document-intelligence workspace that turns an uploaded PDF into grounded
answers. The application combines React and Express with retrieval-augmented
generation (RAG), a no-key local retrieval fallback, voice interaction, and an
optional Model Context Protocol (MCP) search tool.

## Portfolio Snapshot

- **Problem:** answer questions from a user-provided PDF without presenting
  unsupported external text as document evidence.
- **Core design:** document-grounded RAG answers and optional MCP-assisted
  answers are returned and displayed separately.
- **Resilience:** the core workflow remains usable without paid API keys
  through local keyword retrieval.
- **Engineering:** server-side upload validation, runtime-only file storage,
  environment-based configuration, and Node test coverage.

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

## Demo Flow

1. Upload a PDF.
2. The server extracts text and creates retrieval chunks.
3. Ask a question in text or through browser speech recognition.
4. Review the document-grounded answer first.
5. When configured, compare it with a separately labelled MCP-assisted answer.

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
+-- docs/                           # Implementation and learning notes
+-- postman/                        # API requests for backend testing
+-- package.json                    # React and combined development scripts
```

## Prerequisites

- Node.js 20+ LTS
- npm
- A modern browser for voice recognition
- Optional: OpenAI API key and SerpAPI key

## Run the Project

Install the React dependencies:

```powershell
npm install --legacy-peer-deps
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

## Engineering Decisions

- API keys stay in `server/.env`, never in the React build.
- Uploaded PDFs are runtime artifacts and are ignored by Git.
- A missing OpenAI or SerpAPI key results in an explicit fallback/configuration
  message instead of an invented answer.
- The RAG and MCP paths are intentionally separate so a reader can understand
  where an answer came from.
- The project retains the course's Create React App structure; it is useful for
  learning the architecture, though a production rewrite could migrate the
  frontend to Vite.

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
