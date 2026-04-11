# ShieldDB - Job Scam Intelligence Dashboard

ShieldDB is a sophisticated, full-stack Job Aggregation and Cyber-Threat Intelligence platform designed to automatically scrape, evaluate, and flag fraudulent job listings. It acts as an autonomous defense mechanism for job seekers against employment scams.

## 🚀 Features

- **Automated Stealth Scraping:** Uses Playwright to dynamically navigate Naukri.com, circumventing basic bot detection to fetch real-world job postings across twenty different enterprise roles.
- **20-Parameter Threat Engine:** Each listing is passed through a deep heuristic scoring system evaluating 20 critical threat vectors, including:
  - Domain maturity & ICANN RDAP checks
  - Urgency/Pressure language detection
  - Suspicious communication channels (WhatsApp, untracked Telegram links)
  - Missing corporate footprints
- **Corroborated Trust Tiers:** Jobs are mathematically scored on a 0-100 Scam Index and categorized into *Verified Safe*, *Flagged Risky*, and *Critical Threat*.
- **Scroll-Driven Interactive UI:** Features a high-fidelity, Gigantic Media-inspired Next.js front-end complete with a synchronized, scrolling threat-dial animation that explains the 20-parameter engine to users dynamically.

## 🏗️ Architecture

- **Frontend:** Next.js (React 19), pure Vanilla CSS (zero Tailwind dependencies to avoid layer conflicts), dynamic `IntersectionObserver` scroll animations.
- **Backend:** FastAPI (Python), SQLAlchemy ORM.
- **Database:** Auto-switching between Local SQLite (development) and Cloud PostgreSQL (production via Render).
- **Scraping Engine:** Python Playwright + BeautifulSoup4.

## 💻 Local Development Setup

### 1. Database & Backend API
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

To run the local API server across port `8000`:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Dashboard
Open a new terminal session.
```bash
cd frontend
npm install
npm run dev -- -p 3001
```
The Next.js dashboard will be accessible at `http://localhost:3001`.

## 🕷️ Scraping & Populating Data

We provide a specialized tool to bulk-scrape Naukri listings and push them into the database automatically. 
While running the backend virtual environment:

```bash
# Scrape all 20 default roles (Default: 5 jobs per role)
python daily_scrape.py

# Scrape specific roles with custom depths
python daily_scrape.py --roles "Data Analyst,Software Engineer" --max 10
```
*Note: Make sure your `.env` is configured properly. If `DATABASE_URL` is configured, it will push directly to your remote staging database.*

## 🌍 Production Deployment
The infrastructure is strictly configured for instant remote deploy.
- **Next.js Frontend**: Hosted flawlessly on [Vercel](https://vercel.com).
- **FastAPI Backend**: Native support for [Render](https://render.com) Web Services.

Make sure to map the Vercel strictly to the `frontend/` Root Directory, and define `NEXT_PUBLIC_API_URL` leading to your deployed Render instance.
