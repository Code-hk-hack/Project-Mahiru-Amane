# Project Mahiru/Amane 🌸

**Project Mahiru/Amane** is an AI-driven soft-skills and social confidence coaching simulator, presented through a highly interactive Anime Visual Novel aesthetic. It serves as a zero-latency digital training ground to help users build conversational "muscle memory" without the psychological traps of traditional AI companions.

## Core Philosophy: The "No-Escapism" Mandate 🚫
Unlike standard AI chatbots, this platform enforces a strict "No-Escapism" mandate. 
- **No Affection Meters:** The coach is here to teach, not to be romanced.
- **No "Yes-Man" Behavior:** The coach will challenge you, disagree with you, and force you to set boundaries.
- **No Endless Comfort:** The AI will dynamically alter its difficulty tier (acting distracted, impatient, or neutral) to simulate real-world human unpredictability.

## Architecture & Tech Stack 🛠️

This project uses a decoupled Monorepo architecture:

### Frontend (`/frontend`)
- **Framework:** Next.js (React, TypeScript)
- **Styling:** Vanilla CSS (Glassmorphism & vibrant Anime aesthetic)
- **Animations:** Framer Motion & Anime.js
- **Audio:** Web Audio API for zero-latency TTS delivery

### Backend (`/backend`)
- **Framework:** Python (FastAPI)
- **Orchestration:** Multi-Agent Pipeline via OpenRouter API
- **Database:** PostgreSQL (Supabase)
- **Memory & MCP:** 
  - **Mem0**: Provides the Coach Agent with long-term memory to remember user progress and struggles across sessions.
  - **Slashy MCP**: Connects the AI to real-world email/calendar tools to verify "real-world homework" before unlocking new difficulty tiers.
- **Context Graph:** Graphify (`graphifyy`) for persistent codebase context mapping.

## The Multi-Agent Pipeline 🤖
1. **The Analyst Agent:** Silently evaluates the user's input for passive language, excessive apologies, hesitation, and poor boundary setting.
2. **The Coach Agent (Mahiru/Amane):** Takes the Analyst's structural feedback and generates an in-character conversational response according to the current difficulty tier.

## Getting Started 🚀

### Prerequisites
- Node.js (v18+)
- Python (3.13+) & `uv` package manager
- PostgreSQL (Supabase account)

### Setup Instructions
1. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   uv sync
   uv run uvicorn main:app --reload
   ```

## License
MIT License.
