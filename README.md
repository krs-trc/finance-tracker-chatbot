# Finance Tracker Chatbot

A  chatbot interface to log income and expenses, track daily allowance, upcoming bills, and saving goals.

**Live Demo:** [https://fintrack-frontend.onrender.com](https://fintrack-frontend-3wau.onrender.com/signin)

---

## Features

- **Authentication** — Sign up and sign in with JWT-based sessions
- **Chatbot** — Log expenses and income through natural language
- **Quick Summary** — See today and this month's balance instantly
- **Monthly Report** — Full breakdown of income, expenses, and top spending categories
- **Daily Allowance** — Set and track your daily budget
- **Upcoming Bills** — Add bills with due dates, mark them as paid
- **Saving Goals** — Set a savings target and track your progress

---

## Chatbot Commands

| Message | Action |
|---|---|
| `"Spent RM30 on lunch"` | Log expense |
| `"Received RM2000 salary"` | Log income |
| `"Show my summary"` | Today + this month snapshot |
| `"Monthly report"` | Full monthly breakdown |
| `"Report for March"` | Report for specific month |
| `"Help"` | Show all commands |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Styling | Custom CSS with CSS variables |

This app is deployed using **Render** (frontend + backend) and **Neon** (PostgreSQL database).

---

## Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL (via pgAdmin or local install)

### 1. Clone the repo
```bash
git clone https://github.com/krs-trc/finance-tracker.git
cd finance-tracker
```

### 2. Set up the database
Open pgAdmin, create a database called `finance_tracker`, then run the schema:
```
Query Tool → open backend/db/schema.sql → Execute
```

### 3. Configure the backend
```bash
cd backend
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finance_tracker
DB_USER=postgres
DB_PASSWORD=your_pgadmin_password
JWT_SECRET=any_long_random_string
PORT=5000
```

### 4. Start the backend
```bash
npm install
npm run dev
```

### 5. Start the frontend
```bash
cd ../frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---
