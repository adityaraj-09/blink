# Blink AI Code Editor

Blink AI Code Editor is a full-stack workspace for exploring, editing, and reasoning about source code with AI assistance. It pairs a rich, Monaco-powered frontend with an AI-first backend that performs semantic indexing, retrieval, and orchestration across multiple language runtimes.

## Project Structure

- `backend/` – TypeScript/Express API that manages embeddings, repository syncing, and AI-powered conversations.
- `frontend/` – Vite + React application that renders the Blink editing experience and connects to the backend APIs.
- `README.md` – You are here.

## Backend Overview (`backend/`)

The backend is an Express server written in TypeScript. It orchestrates code understanding workflows by combining several services:

- Embedding generation with `@google/generative-ai`, `openai`, and ChromaDB via `chromadb` and the `@chroma-core/default-embed` stack.
- Repository introspection using `simple-git`, Merkle tree comparisons, and multiple `tree-sitter` grammars for cross-language parsing.
- Conversation memory and cache layers with Redis (`ioredis`) and SQLite (`better-sqlite3`).
- Secure, production-friendly deployment defaults via `helmet`, `express-rate-limit`, and Clerk authentication hooks.

### Backend Scripts

- `npm install` – install dependencies.
- `npm run dev` – start the dev server with hot reload (`ts-node-dev`).
- `npm run build` – compile TypeScript to `dist/`.
- `npm start` – run the compiled server.

Environment variables (see `backend/.env.example` if present) typically include API keys for OpenAI, Google Generative AI, Redis, and Qdrant/Chroma endpoints.

## Frontend Overview (`frontend/`)

The frontend is a Vite/React app designed to feel like a native code editor:

- Monaco editor (`@monaco-editor/react`) with theme customization and syntax highlighting.
- Multi-pane layout driven by `react-resizable-panels` and 3D visuals via `three`/`ogl`.
- Clerk authentication UI (`@clerk/clerk-react`) and route handling with `react-router-dom`.
- Tailwind CSS v4 tooling for rapid styling.

### Frontend Scripts

- `npm install` – install dependencies.
- `npm run dev` – launch the Vite dev server.
- `npm run build` – create a production bundle.
- `npm run preview` – preview the build locally.

## Getting Started

1. **Clone the repo** and install dependencies in each workspace:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```
2. **Configure environment variables** for the backend (API keys, Redis, vector store URLs).
3. **Run the backend** with `npm run dev --prefix backend` and the frontend with `npm run dev --prefix frontend` in separate terminals.
4. Visit the frontend dev URL (default `http://localhost:5173`) and authenticate via Clerk to access the editor.

## Key Capabilities

- AI-aware code editor with Monaco and syntax-aware tooling.
- Incremental repository indexing backed by Merkle trees and multi-language parsers.
- Vector search and semantic retrieval via ChromaDB/Qdrant.
- Conversation orchestration combining embeddings, OpenAI, and Google Gemini.
- Secure API surface with rate limiting, logging (`winston`), and structured validation (`zod`).

## Contributing

Contributions are welcome! Please open an issue or pull request with clear reproduction steps or implementation details. Ensure TypeScript builds succeed and lint the frontend before submitting.

## License

MIT License © Blink AI Code Editor contributors.
