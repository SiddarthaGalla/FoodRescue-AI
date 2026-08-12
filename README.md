# FoodRescue AI 🌿

> Production-ready, AI-driven surplus food redistribution platform connecting restaurants, shelters, and volunteer drivers in real-time.

---

## 🏗 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Recharts.
- **Backend**: FastAPI (Python), Motor (Async MongoDB), Pydantic v2, PyJWT, Passlib (Bcrypt).
- **Database**: MongoDB (Local or Atlas) + Async Client.
- **Authentication**: JWT Token-based Auth with Role-Based Access Control (RBAC).

---

## 📁 Repository Structure

```
FoodRescue-AI/
├── frontend/             # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── animations/   # Framer Motion variants
│   │   ├── components/   # Navbar, Footer, Sidebar, ProtectedRoute, LoadingScreen
│   │   ├── contexts/     # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/        # Public pages & Role-based Dashboards (Admin, Donor, NGO, Volunteer)
│   │   ├── services/     # API Client
│   │   └── types/        # TypeScript Interfaces
│   └── package.json
│
└── backend/              # FastAPI + MongoDB Backend
    ├── app/
    │   ├── api/          # v1 Router & Auth / Health Endpoints
    │   ├── core/         # Security, JWT, Configuration
    │   ├── db/           # Motor Async MongoDB Connection
    │   ├── models/       # MongoDB User Document Helpers
    │   └── schemas/      # Pydantic Request / Response Models
    ├── main.py           # FastAPI Application Entrypoint
    └── requirements.txt
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend will run at: `http://localhost:8000` (Docs at `http://localhost:8000/docs`).

### 2. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
Frontend will run at: `http://localhost:5173`.

---

## 🔐 Auth & Role Dashboards

The application features 4 role-specific dashboards:
1. **Admin Dashboard**: `http://localhost:5173/dashboard/admin`
2. **Donor Dashboard**: `http://localhost:5173/dashboard/donor`
3. **NGO Dashboard**: `http://localhost:5173/dashboard/ngo`
4. **Volunteer Dashboard**: `http://localhost:5173/dashboard/volunteer`

---

## 🛡 License

MIT License. Built with ❤️ for zero food waste.
