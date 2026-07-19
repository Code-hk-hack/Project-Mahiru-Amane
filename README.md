# Aura AI 🌸

**Aura AI** is an AI-driven soft-skills and social confidence coaching simulator, presented through a highly interactive Anime Visual Novel aesthetic. It serves as a zero-latency digital training ground to help users build conversational "muscle memory" without the psychological traps of traditional AI companions.

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

## 💼 Hackathon Pitch: Training Youth for Interviews

**The Problem:** Youth entering the workforce often struggle with extreme interview anxiety, imposter syndrome, and passive language ("I'm sorry", "Umm", "Maybe"). Standard interview prep feels clinical and boring.

**Our Solution (The Training Mechanism):**
By gamifying interview prep through a Visual Novel interface, we provide a high-pressure, emotionally charged environment. The harsh, "tsundere" AI coach forces the user to maintain their composure and assert boundaries. If a user can speak confidently to a strict anime mentor who is actively analyzing their every word, a real-life HR interviewer will feel easy by comparison.

**How We Gain Data:**
- **Real-Time Linguistics:** The Analyst Agent parses every single user message and scores it for Passiveness (0/10), Apologies, and Hesitations.
- **Supabase Logging:** All conversation turns, alongside their linguistic scores, are permanently logged into our PostgreSQL database, tagged by `session_id`.

**How We Use The Data (The Business Value):**
- **Adaptive Difficulty:** As the database detects a user consistently scoring 0 on hesitations, the backend dynamically increases the "difficulty tier" (e.g., the interviewer acts distracted or impatient) to push the user further.
- **Progress Tracking:** We can aggregate the Supabase data to show concrete improvement metrics over time (e.g., "User's apology frequency decreased by 40% over 5 sessions"). 
- **Institutional Reporting:** This aggregated data provides massive value to schools, NGOs, and career centers looking to track the soft-skill development of their students.

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
