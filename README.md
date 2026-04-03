# Σ Episteme — The Deterministic Learning Engine

**Tagline:** *A deterministic AI that diagnoses why students fail — and fixes the root cause.*

---

## 🏛️ Project Overview

**Episteme** replaces the uncertainty of "guessing" AI models with a rigorous, clinically-inspired diagnostic engine. While standard LLMs often hallucinate or provide shallow corrections, Episteme uses **Deterministic NLP**, **Fault Tree Analysis (FTA)**, and **Knowledge DAGS** to mathematically identify the cognitive gaps preventing a student from mastering a concept.

**IntelliRev** is the student-facing platform that makes this engine accessible, transforming raw syllabi into structured, adaptive learning paths with zero hallucinations.

---

## 🧠 The Intelligence Stack

### 1. Fault Tree Engine (The "Why")
Every question in our system is backed by a clinical Fault Tree. When a student fails a question, the engine traverses **AND/OR gates** to identify the **Minimal Cut Set** — the exact prerequisite or specific logic point that failed.

### 2. Prerequisite Knowledge DAG
Concepts are stored in a **Directed Acyclic Graph**. If a student fails a "Differential Calculator" problem, the system uses **Blame Backpropagation** to trace the failure back to upstream concepts like "Limit Theorems" or "Basic Algebra."

### 3. IRT Ability Estimation 
Using **Item Response Theory (IRT)**, we estimate a student’s latent ability (θ). Unlike raw scores, θ represents the probability of mastery, allowing the engine to select questions that are perfectly calibrated to the student's edge of knowledge.

### 4. Behavior Tree Sequencer
Our remediation logic is orchestrated by a **Behavior Tree**. It switches between **DRILL**, **REMEDY**, and **ADVANCE** modes based on real-time fatigue metrics and calibration state, ensuring the student stays in the "Flow Zone."

---

## ✨ Features

- **Autonomous Ingestion**: Upload a syllabus (Text/PDF) and the system auto-extracts a 5-day study plan via TF-IDF and NLP.
- **RAG-Powered Smart QA**: Textbook context combined with curated YouTube transcripts ensures answers are grounded in ground-truth facts.
- **Cognitive Consistency Grid**: A GitHub-style activity heatmap that tracks cognitive resonance and learning streaks.
- **Explainable Feedback**: Judges and teachers can see the "Decision Trace" behind every diagnostic result.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS (Vanilla CSS components), Framer Motion, Recharts.
- **Backend**: FastAPI (Python 3.11), spaCy (POS/NER), NLTK (Summarization), Scikit-Learn (TF-IDF).
- **Core Engine**: `py-trees` (Behavior Trees), Custom FTA Engine, `networkx` (DAG management).
- **Database**: Supabase (PostgreSQL + Auth + Vector Storage).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/crazy-coder-neel/zentrix.git
   cd zentrix
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Setup .env with SUPABASE_URL, SUPABASE_KEY, and TAVILY_API_KEY
   python app.py
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   # Setup .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   npm run dev
   ```

---

## 🌐 Deployment

- **Frontend**: Targeted for **Vercel** (`frontend/vercel.json` included).
- **Backend**: Optimized for **Render/Docker** (`backend/Dockerfile` included).

---

## 📝 License
Built for the **Codewiser Hackathon**. Copyright © 2026.
