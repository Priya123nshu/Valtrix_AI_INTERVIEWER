# 🤖 Valtrix AI Interviewer

An autonomous, enterprise-grade AI technical interviewer platform. Conducts real-time voice interviews, performs deep background scraping across candidate resumes & GitHub repositories, customizes questions to specific company rubrics, and generates comprehensive candidate assessment reports.

---

## 🌟 Key Capabilities

- **🎙️ Real-time Voice Interaction**: Ultra-low-latency two-way conversational interviews using OpenAI's Realtime models.
- **📄 Resume Deep Extraction**: Intelligent resume parsing that extracts technical competencies, key achievements, and generates targeted technical questions.
- **🐙 GitHub Intelligence**: Automated scraping of GitHub public profile data, top repositories, language distributions, and commit volume.
- **🏢 Company-Specific Rubrics**: Configurable evaluation criteria simulating interview bars of top tech companies across Fresher, Mid, and Senior levels.
- **📊 Automated Candidate Scorecards**: Instant assessment covering technical accuracy, system design, problem-solving, and communication skills.
- **📑 Architecture PDF Generator**: Built-in engine to generate architecture summaries and documentation.

---

## 🏗️ Project Architecture

This project is organized as a high-performance monorepo powered by **Bun** and **Turborepo**:

```text
Valtrix_AI_INTERVIEWER/
├── ai-interviewer/
│   ├── apps/
│   │   ├── backend/        # Express + Prisma + WebSocket service (Port 3001)
│   │   │   ├── prisma/     # PostgreSQL schema and migration scripts
│   │   │   ├── scrapers/   # Resume, GitHub & Company intelligence engines
│   │   │   └── Dockerfile  # Backend container spec
│   │   └── frontend/       # React 19 + Tailwind CSS v4 + Radix UI (Port 3002)
│   │       ├── src/        # Voice Orb, Interview Console & Results dashboard
│   │       └── Dockerfile  # Frontend container spec
│   ├── packages/           # Shared ESLint and TypeScript configs
│   └── docker-compose.yml  # Multi-container orchestration
└── README.md
```

---

## 📋 Prerequisites

Before setting up the project, make sure you have:

- **[Bun](https://bun.com)** (v1.1 or higher)
- **[Node.js](https://nodejs.org)** (v18+ LTS)
- **[PostgreSQL](https://www.postgresql.org)** (v14+ or via Docker)
- **[OpenAI API Key](https://platform.openai.com)** with Realtime API & GPT-4o access
- **[Docker & Docker Compose](https://www.docker.com)** *(Optional)*

---

## 🚀 Setup & Installation Guide

### 1. Clone the Repository

```bash
git clone https://github.com/Priya123nshu/Valtrix_AI_INTERVIEWER.git
cd Valtrix_AI_INTERVIEWER/ai-interviewer
```

### 2. Install Monorepo Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

#### Backend `.env`

Copy the backend environment template:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` with your credentials:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:password@localhost:5432/interviewer_db?schema=public"
OPENAI_API_KEY="sk-proj-your-openai-api-key"
REALTIME_MODEL="gpt-4o-realtime-preview"
```

#### Frontend `.env` (Optional)

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

### 4. Database Setup (Prisma)

Ensure your PostgreSQL instance is running, then apply migrations:

```bash
cd apps/backend
bunx prisma migrate dev
bunx prisma generate
cd ../..
```

### 5. Run the Application

Start all services simultaneously with Turborepo:

```bash
bun dev
```

- **Frontend Application**: [http://localhost:3002](http://localhost:3002)
- **Backend API Server**: [http://localhost:3001](http://localhost:3001)

---

## 🐳 Docker Deployment

To spin up the entire system in isolated containers:

```bash
cd ai-interviewer
docker compose up --build
```

---

## 🛡️ Security

- All secret tokens, API keys, and environment files are strictly excluded from source control.
- Never commit `.env` or sensitive credentials to GitHub.
