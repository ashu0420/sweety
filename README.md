# Sweety — Blood Glucose Monitoring Application

A full-stack web application for logging, managing, and analyzing blood glucose readings across daily, month-to-date, and monthly periods.

## Tech Stack
- **Backend:** Node.js, Express, PostgreSQL (`pg`), JWT (`jsonwebtoken`), `bcryptjs`
- **Frontend:** React (Vite), React Router, Axios, Tailwind CSS v4
- **Testing:** Vitest, Supertest (Unit + API Integration tests)

## Project Structure
```text
sweety/
├── server/                 # Express REST API + PostgreSQL + Vitest tests
│   ├── src/
│   │   ├── config/db.js    # PostgreSQL pool & custom DATE parser (OID 1082)
│   │   ├── controllers/    # Auth, Readings CRUD, and Reports logic
│   │   ├── db/             # schema.sql & database initialization script
│   │   ├── middleware/     # JWT authentication middleware
│   │   ├── routes/         # Express route definitions
│   │   └── utils/          # Input validation & report date-range helpers
│   └── tests/              # Unit & Supertest integration test suites
└── client/                 # React + Vite + Tailwind CSS SPA
    └── src/
        ├── api/axios.js    # Axios instance with JWT Bearer interceptor
        └── pages/          # Register, Login, and Dashboard views
```

## Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL** running locally

## Getting Started

### 1. Database Setup
Create a PostgreSQL database named `sweety_db`:
```bash
psql -U postgres -c "CREATE DATABASE sweety_db;"
```

### 2. Backend Setup (`server/`)
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
npm run db:init
npm run dev
```
The API server will start on `http://localhost:5000`.

### 3. Running Backend Tests
```bash
cd server
npm test
```

### 4. Frontend Setup (`client/`)
Open a new terminal:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register a new user (`{ name, email, password }`)
- `POST /api/auth/login` — Authenticate and receive a JWT (`{ email, password }`)

### Readings (Requires `Authorization: Bearer <token>`)
- `GET /api/readings?page=1&limit=20&date=YYYY-MM-DD` — Paginated list of readings
- `POST /api/readings` — Log a reading (`{ reading_date, slot, value }`)
- `PUT /api/readings/:id` — Update an existing reading
- `DELETE /api/readings/:id` — Delete a reading

### Reports (Requires `Authorization: Bearer <token>`)
- `GET /api/reports?date=YYYY-MM-DD` — Returns `daily` (with chronological slot breakdown), `monthToDate`, and `previousMonth` statistics (`count`, `highest`, `lowest`, `average`).

## Validation & Business Rules
1. **Required Glucose Value:** Rejects empty or missing values (`"Please enter a glucose value."`).
2. **Valid Range:** Whole integers between 40 and 600 mg/dl (`"Value must be between 40 and 600 mg/dl."`).
3. **Unique Slot per Date:** Only one reading per slot per day (`"You already have an <slot> reading for this date."`).
4. **Daily Cap:** Maximum of 4 readings per day (`"You can add only 4 readings per day."`).
5. **No Future Dates:** Rejects dates after today (`"Date cannot be in the future."`).