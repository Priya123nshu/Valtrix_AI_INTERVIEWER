# 🤖 Valtrix AI Interviewer

An enterprise-ready, autonomous AI Interviewer platform featuring real-time conversational voice interviews, automated resume & GitHub intelligence extraction, behavioral and technical evaluation, and automated candidate assessment report generation.

---

## 🌟 Key Features

- **🎙️ Real-time Conversational Voice**: Low-latency, full-duplex voice interviews powered by OpenAI Realtime API (WebSockets / WebRTC).
- **📄 Resume & Profile Intelligence**: Automated parsing of candidate resumes, extracting skills, experience, and tailored question vectors.
- **🐙 GitHub Repository Analysis**: In-depth scraping and analysis of candidate's public GitHub activity, code patterns, and project complexity.
- **🏢 Company & Culture Customization**: Contextual interview simulation tailored to target companies (Amazon, Google, Meta, startups) and seniority levels (Fresher, Mid, Senior).
- **📊 Real-time Assessment & Scorecards**: Automated calculation of communication, problem-solving, and technical depth scores with feedback transcripts.
- **📑 Architecture & Summary Export**: Built-in architecture report and PDF generation capabilities.
- **⚡ Monorepo Architecture**: High-performance monorepo driven by [Bun](https://bun.com) and [Turborepo](https://turbo.build).

---

## 🏗️ Architecture & Monorepo Structure

```text
ai-interviewer/
├── apps/
│   ├── backend/           # Express + Prisma + WebSocket service (Port 3001)
│   │   ├── prisma/        # Database schema & migrations
│   │   ├── scrapers/      # Resume, GitHub & Company Intel engines
│   │   ├── index.ts       # Main API & Realtime WebRTC endpoints
│   │   └── Dockerfile
│   └── frontend/          # React 19 + Tailwind v4 + Radix UI (Port 3002)
│       ├── src/           # UI components, voice orb & interview console
│       └── Dockerfile
├── packages/              # Shared TypeScript & ESLint configurations
├── docker-compose.yml     # Multi-container local orchestration
└── turbo.json             # Monorepo task pipeline configuration
```

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- **[Bun](https://bun.com)** (v1.1+ recommended): Fast JavaScript runtime and package manager.
- **[Node.js](https://nodejs.org)** (v18+ LTS): Required for compatible tooling.
- **[PostgreSQL](https://www.postgresql.org)** (v14+): Or run PostgreSQL inside Docker.
- **[Docker & Docker Compose](https://www.docker.com)** *(Optional)*: For containerized deployment.
- **[OpenAI API Key](https://platform.openai.com)**: With access to GPT-4o / Realtime models.

---

## 🚀 Quick Start & Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/Priya123nshu/Valtrix_AI_INTERVIEWER.git
cd Valtrix_AI_INTERVIEWER/ai-interviewer
```

### 2. Install Dependencies

Install all dependencies across the monorepo using Bun:

```bash
bun install
```

---

### 3. Configure Environment Variables

#### Backend Configuration

Navigate to `apps/backend/` and copy the `.env.example`:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and update the values:

```env
PORT=3001

# Database connection URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/interviewer_db?schema=public"

# OpenAI API Key (Required for voice & interview evaluation)
OPENAI_API_KEY="sk-proj-your-openai-api-key"

# Models (Optional defaults)
REALTIME_MODEL="gpt-4o-realtime-preview"
RESUME_EXTRACTION_MODEL="gpt-4o"
EVALUATION_MODEL="gpt-4o"
```

#### Frontend Configuration

Navigate to `apps/frontend/` and create `.env` if custom ports are required:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

---

### 4. Database Setup & Migrations

Make sure your PostgreSQL server is running. Then, generate Prisma client and apply migrations from the backend folder:

```bash
cd apps/backend
bunx prisma migrate dev
bunx prisma generate
cd ../..
```

---

### 5. Start the Application

You can start the full monorepo (both backend and frontend concurrently) from the `ai-interviewer` root:

```bash
bun dev
```

Alternatively, you can run each service individually:

- **Backend** (Port 3001):
  ```bash
  cd apps/backend
  bun dev
  ```
- **Frontend** (Port 3002):
  ```bash
  cd apps/frontend
  bun dev
  ```

---

## 🐳 Running with Docker Compose

To spin up both backend and frontend in isolated containers:

```bash
# From the ai-interviewer root directory
docker compose up --build
```

- **Frontend**: Accessible at `http://localhost:3002`
- **Backend API**: Accessible at `http://localhost:3001`

---

## 📡 API Reference & Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Health status and uptime check |
| `/api/v1/pre-interview` | `POST` | Ingests resume, GitHub profile & company metadata |
| `/api/v1/behavioral-questions` | `GET` | Fetches targeted behavioral questions for seniority & company |
| `/api/v1/interview/:id/finish` | `POST` | Concludes interview and triggers AI scorecard calculation |
| `/api/v1/interview/:id/result` | `GET` | Retrieves final evaluation, transcript, and score |
| `/api/v1/generate-pdf` | `GET` | Generates architectural documentation PDF |

---

## 🛡️ Security & Privacy

- All `.env` files and API credentials are kept out of source control via rigorous `.gitignore` configurations.
- Candidate resumes and transcripts are securely stored and processed.