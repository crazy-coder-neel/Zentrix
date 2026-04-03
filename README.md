# 🚀 Deployment Guide — Episteme & IntelliRev

This project is a unified learning platform using a **React Frontend** and a **FastAPI Backend (Deterministic NLP/Cognitive Engines)**.

## 1. ⚛️ Frontend Deployment (Vercel)
The frontend is pre-configured for Vercel with SPA routing.

- **Project Root**: `frontend/`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: Your deployed Backend URL (e.g., `https://backend.render.com`)
  - `VITE_SUPABASE_URL`: Your Supabase URL
  - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key

## 2. 🐍 Backend Deployment (Render / Railway / Docker)
The backend requires heavy Python libraries (`spacy`, `nltk`, `scikit-learn`) and is best suited for **Render**, **Railway**, or any **Dockerized** host.

### Option A: Render (Easiest)
- **Runtime**: `Python` or `Docker`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `SUPABASE_URL`: Your Supabase URL
  - `SUPABASE_KEY`: Your Supabase Key (Service Role or Anon)
  - `TAVILY_API_KEY`: Your Tavily API Key
  - `FRONTEND_URL`: Your deployed Vercel URL

### Option B: Docker
If your host supports Docker (like DigitalOcean, AWS, or Railway), use the provided `backend/Dockerfile`. It pre-bundles all dependencies and NLTK data for fast startup.

## 3. ⚙️ Supabase Setup
Ensure your Supabase project has the initial schema and buckets:
1.  Run the code in `backend/db/schema.sql` (if available) or create a `students` and `responses` table.
2.  Enable **Row Level Security (RLS)** or set up appropriate policies.
3.  Add your Supabase URL and Key to **both** frontend and backend environments.

## 💡 Troubleshooting
- **CORS Errors**: Ensure the `FRONTEND_URL` in the backend `.env` matches your Vercel deployment URL.
- **spaCy Errors**: If you encounter an "en_core_web_sm not found" error during the build, ensure the start command is preceded by `python -m spacy download en_core_web_sm` if not using the Dockerfile.