# SkillBridge 🎓

A peer-to-peer academic tutoring platform for Indian college students. Connect with fellow students who can teach — discover tutors by subject, book sessions, and grow together.

**Live Demo:** _(deploy and add URL here)_  
**Backend API Docs:** `{backend-url}/api/v1/docs`

---

## Problem Statement

Indian college students often struggle with subjects they can get unstuck by a knowledgeable senior or batchmate. Traditional coaching is expensive. SkillBridge closes this gap by creating a trusted peer marketplace where students can offer and book tutoring sessions affordably.

---

## Features

### For Learners
- 🔍 Browse the tutor marketplace with search and subject/rating filters
- 👤 View detailed tutor profiles with ratings, reviews and offerings
- 📅 Book sessions from offerings with date, time and duration selection
- 🗂 Manage bookings — view pending, upcoming, completed and cancelled sessions
- ⭐ Submit reviews (1–5 stars) for completed sessions
- 🔔 Real-time notifications for booking confirmations and session updates

### For Tutors
- 📝 Create and manage tutoring offerings with pricing in ₹
- ✅ Accept or decline incoming booking requests
- 📋 Dashboard to manage upcoming and completed sessions
- ✔️ Mark sessions as complete
- 🏆 Build reputation through student reviews and ratings

### Platform
- 🔒 JWT authentication via HttpOnly secure cookies (no localStorage)
- 🛡 Role-based access control (learner/tutor)
- 🚫 Booking conflict prevention with HTTP 409 on scheduling overlaps
- 📊 Automatic rating recalculation on each review submission
- 🇮🇳 Indian Rupee (₹) pricing and Indian college localisation

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript 5, Tailwind CSS |
| Backend | Python 3.13, FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (strict mapped columns) |
| Database | SQLite (local dev) → PostgreSQL (production) |
| Migrations | Alembic |
| Auth | JWT in HttpOnly cookies, bcrypt password hashing |
| HTTP Client | Axios with `withCredentials: true` |
| Testing | Pytest + HTTPX (41 backend tests) |
| Deployment | Render (backend) + Vercel (frontend) + Supabase (database) |

---

## Architecture

```
skillbridge-2/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/            # Route handlers
│   │   │   ├── auth.py        # Register, login, logout, /me
│   │   │   ├── users.py       # Profile view/update
│   │   │   ├── tutors.py      # Marketplace search, tutor detail
│   │   │   ├── offerings.py   # Offering CRUD
│   │   │   ├── sessions.py    # Booking engine + state machine
│   │   │   ├── reviews.py     # Review submission
│   │   │   └── notifications.py
│   │   ├── core/
│   │   │   ├── config.py      # Pydantic settings (env vars)
│   │   │   ├── security.py    # JWT + bcrypt utilities
│   │   │   └── dependencies.py # Auth guards (get_current_user etc.)
│   │   ├── db/session.py      # SQLAlchemy engine + session
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic (conflict check, notifications)
│   ├── alembic/               # Database migrations
│   ├── tests/                 # 41 pytest tests
│   ├── seed_data.py           # Demo data seeder
│   ├── requirements.txt
│   └── start.sh               # Production startup (migrate + serve)
│
└── frontend/                  # Next.js frontend
    └── src/
        ├── app/
        │   ├── (auth)/        # Login, Register pages
        │   ├── (dashboard)/   # Marketplace, Tutors, Profile, Dashboard, Offerings
        │   ├── layout.tsx
        │   └── page.tsx       # Landing page
        ├── components/
        │   ├── common/        # Button, Badge, Card, Input, Spinner, StarRating
        │   ├── layout/        # Navbar (with notification polling)
        │   └── marketplace/   # TutorCard, FilterSidebar, SearchBar
        ├── context/           # AuthContext (HttpOnly cookie session restoration)
        ├── hooks/             # useAuth
        ├── lib/               # api.ts (axios), constants.ts, utils.ts
        ├── services/          # auth, user, tutor, offering, session, review, notification
        └── types/index.ts     # TypeScript interfaces matching backend schemas
```

---

## Database Schema

| Table | Key Fields |
|-------|-----------|
| `users` | id, email, hashed_password, full_name, role (learner/tutor), bio, college, department, year_of_study |
| `tutor_profiles` | user_id (FK), hourly_rate, teaching_subjects, experience_years, average_rating, total_reviews, total_sessions_completed |
| `offerings` | id, tutor_id (FK), title, subject, description, level, hourly_rate, is_active |
| `sessions` | id, offering_id (FK), learner_id (FK), tutor_id (FK), scheduled_start, scheduled_end, duration_minutes, status (pending/accepted/rejected/completed/cancelled), learner_notes, cancellation_reason |
| `reviews` | id, session_id (FK, unique), learner_id (FK), tutor_id (FK), rating (1–5), comment |
| `notifications` | id, user_id (FK), title, message, notification_type, link_url, is_read |

### Session State Machine
```
pending → accepted   (tutor only, conflict check)
pending → rejected   (tutor only)
pending → cancelled  (learner only)
accepted → completed (tutor only)
accepted → cancelled (either party)
```

---

## API Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register learner or tutor | Public |
| POST | `/api/v1/auth/login` | Login, sets HttpOnly cookie | Public |
| POST | `/api/v1/auth/logout` | Logout, clears cookie | Required |
| GET | `/api/v1/auth/me` | Get current user | Required |
| GET/PATCH | `/api/v1/users/me` | View/update profile | Required |
| GET | `/api/v1/tutors` | Marketplace search + filters | Public |
| GET | `/api/v1/tutors/{id}` | Tutor detail + offerings + reviews | Public |
| GET/POST | `/api/v1/offerings` | List offerings / Create offering | GET Public, POST Tutor |
| GET/PUT/DELETE | `/api/v1/offerings/{id}` | CRUD on offering | GET Public, PUT/DELETE Owner |
| POST | `/api/v1/sessions` | Create booking | Learner |
| GET | `/api/v1/sessions` | List my sessions | Required |
| GET | `/api/v1/sessions/{id}` | Session detail | Participant |
| PATCH | `/api/v1/sessions/{id}/status` | Accept/reject/complete/cancel | Role-restricted |
| POST | `/api/v1/reviews` | Submit review | Learner (completed session) |
| GET | `/api/v1/reviews` | Get tutor reviews | Public |
| GET | `/api/v1/notifications` | Get notifications | Required |
| PATCH | `/api/v1/notifications/{id}/read` | Mark one as read | Required |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read | Required |

Full interactive API docs: `{backend-url}/api/v1/docs`

---

## Local Development Setup

### Prerequisites
- Python 3.13+
- Node.js 18+
- pnpm or npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Linux/macOS)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY to a random string

# Run migrations
alembic upgrade head

# Seed demo data
python seed_data.py

# Start development server
uvicorn app.main:app --reload --port 8000
```

Backend available at: `http://localhost:8000`  
API docs: `http://localhost:8000/api/v1/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local — NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Frontend available at: `http://localhost:3000`

---

## Demo Accounts

> All demo accounts use password: **`password123`**

| Role | Name | Email | College |
|------|------|-------|---------|
| Learner | Aarav Sharma | aarav.learner@college.edu | IIT Delhi |
| Learner | Priya Nair | priya.learner@college.edu | BITS Pilani |
| Tutor | Rohan Kulkarni | rohan.tutor@college.edu | IIT Bombay · ₹500/hr |
| Tutor | Ananya Deshmukh | ananya.math@college.edu | DU St. Stephen's · ₹400/hr |
| Tutor | Vikram Malhotra | vikram.chem@college.edu | IISc Bangalore · ₹450/hr |

---

## Running Tests

```bash
cd backend
.\venv\Scripts\activate   # or source venv/bin/activate on Linux

# Run all 41 backend tests
pytest tests -v

# Expected: 41 passed
```

```bash
cd frontend

# TypeScript type check
npx tsc --noEmit

# Production build check
npm run build
```

---

## Demonstration Sequence

### Learner Journey
1. Open `http://localhost:3000` → View landing page
2. Click **Browse Tutors** → Browse marketplace
3. Search for "Data Structures" → Filter by subject
4. Click on **Rohan Kulkarni** → View full tutor profile
5. Click **Book this Offering** → Select date/time/duration → Send booking request
6. Register or log in as `aarav.learner@college.edu` / `password123`
7. Navigate to **My Sessions** → View pending booking
8. Check the 🔔 bell icon → See booking notification
9. After tutor accepts: session moves to Upcoming tab
10. After session completes: click **Write Review** → Submit rating

### Tutor Journey
1. Log in as `rohan.tutor@college.edu` / `password123`
2. Navigate to **Dashboard** → View pending booking requests
3. Click **Accept** on a pending request → Booking confirmed
4. Click **My Offerings** → View existing offerings
5. Click **+ New Offering** → Fill form → Create offering
6. Click **Edit** on existing offering → Update price or description
7. After session time passes: click **Mark Complete**
8. Check 🔔 bell → See notification activity

---

## Production Deployment

### Free Tier Architecture
| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | Vercel Hobby (free) | Next.js hosting with CI/CD |
| Backend API | Render Free (750 hrs/month) | FastAPI Python server |
| Database | Supabase Free (500 MB) | PostgreSQL database |
| Source Control | GitHub Free | Repository + CI/CD trigger |

### Backend Deployment (Render)

1. Push code to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo, set **Root Directory** to `backend`
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `bash start.sh`
6. Set environment variables:
   ```
   DATABASE_URL=postgresql://...  (from Supabase)
   SECRET_KEY=your-random-64-char-secret
   BACKEND_CORS_ORIGINS=https://your-app.vercel.app
   COOKIE_SECURE=True
   COOKIE_SAMESITE=none
   ```
7. After first deploy, run seed: (via Render Shell) `python seed_data.py`

### Frontend Deployment (Vercel)

1. Import project from GitHub on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Set environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
   ```
4. Deploy — Vercel handles build and hosting automatically

> **Important:** When frontend (Vercel) and backend (Render) are on different domains, set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=True` on the backend. The frontend must use `credentials: 'include'` on all API calls (already configured in `src/lib/api.ts`).

### Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database** → copy the **Connection String** (URI format)
3. Use this as `DATABASE_URL` on Render
4. Alembic runs migrations on startup via `start.sh`

---

## Known Limitations

- **SQLite concurrency:** Local development uses SQLite which has single-writer concurrency. Production uses PostgreSQL which supports full concurrent access.
- **Render free tier sleep:** The free backend service sleeps after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to warm up.
- **No real-time WebSockets:** Notifications use 30-second polling. No push notifications in this version.
- **No file uploads:** Avatar URLs must be direct image links (e.g., from Unsplash).
- **No payment integration:** Session pricing is for display only. No actual payment processing.

---

## Project Information

**Course:** [Your course name]  
**Institution:** [Your institution]  
**Academic Year:** 2026–27  
**Submission Deadline:** November 2026

**Public Application URL:** _(add after deployment)_
