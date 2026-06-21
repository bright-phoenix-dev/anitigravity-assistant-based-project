# 🌍 CarbonWise — Carbon Footprint Tracker with AI Assistant

> **Understand, track, and reduce your carbon footprint through simple actions and personalized insights.**

CarbonWise is a full-stack web application that helps individuals monitor their carbon emissions, build eco-friendly habits, and receive AI-powered recommendations — all in a beautiful, dark-themed interface.

---

## 📋 Chosen Vertical

**Personal Carbon Footprint Tracking & Reduction Platform**

CarbonWise focuses on individual-level carbon emission tracking across five key lifestyle categories:
- **Transport** — Driving, flying, public transit, cycling
- **Energy** — Electricity, natural gas, heating
- **Food** — Meal types (red meat to vegan) and dairy
- **Waste** — Landfill vs. recycled vs. composted
- **Shopping** — Clothing, electronics, furniture

The platform pairs data tracking with a context-aware AI assistant that provides personalized, actionable advice based on each user's unique emission profile.

---

## 🧠 Approach and Logic

### AI Decision Engine Architecture

The AI assistant uses a **custom rule-based decision engine** — not an LLM API. This ensures:
- ✅ **Deterministic behavior** — Same inputs produce predictable outputs
- ✅ **Zero external dependencies** — Fully self-contained, works offline
- ✅ **Complete testability** — Every decision path is unit-testable
- ✅ **Low latency** — Responses in milliseconds, no API calls

#### The AI Pipeline

```
User Message → Intent Classifier → Context Builder → Response Generator
                                                          ↓
                                                    Rules Engine
                                                          ↓
                                               Personalized Response
                                               + Action Payloads
```

1. **Intent Classifier** (`intent-classifier.js`)
   - Uses weighted keyword scoring + regex pattern matching
   - Supports 9 intents: `log_activity`, `check_score`, `get_tips`, `add_habit`, `compare`, `set_goal`, `greeting`, `help`, `general`
   - Extracts structured data (quantities, activity hints, habit names)

2. **Context Builder** (`context-builder.js`)
   - Aggregates user data from all database tables
   - Builds a rich context object with: monthly emissions, category breakdown, weekly trends, habit streaks, temporal data (season, time of day), regional benchmarks

3. **Rules Engine** (`rules-engine.js`)
   - 16 priority-weighted rules (priority 1-10)
   - Each rule has: `condition(context) → boolean` and `generate(context) → {message, actions}`
   - Rules cover: goal alerts, category insights, streak celebrations, proactive suggestions, seasonal tips, onboarding

4. **Response Generator** (`response-generator.js`)
   - Routes to intent-specific handlers
   - Interpolates user data into natural-language responses
   - Attaches action payloads that the frontend can execute (e.g., `add_habit`, `confirm_log`, `set_goal`)

### State Management

**Backend:**
- SQLite database with WAL mode for concurrent reads
- Prepared statements for all queries (prevents SQL injection)
- Aggregated summary queries with period-based date filtering

**Frontend:**
- React Context API for global state (`AuthContext` + `AppContext`)
- Optimistic UI updates for activities and habits
- JWT stored in localStorage with auto-validation on mount

---

## 🏗️ How the Solution Works

### Architecture Overview

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│     Frontend (Next.js 14)    │     │    Backend (Express.js)      │
│                              │     │                              │
│  Landing ──► Auth Pages      │     │  JWT Auth Middleware         │
│              ↓               │ API │  Rate Limiting (express)     │
│  Dashboard ◄─► Sidebar Nav   │◄───►│  Input Validation            │
│  Log Activity (form + calc)  │     │                              │
│  Habits (CRUD + streaks)     │     │  Routes:                     │
│  Analytics (Recharts)        │     │    /api/auth/*               │
│  AI Chat Widget (floating)   │     │    /api/activities/*         │
│                              │     │    /api/habits/*             │
│  Context: AuthContext        │     │    /api/chat/*               │
│  Context: AppContext         │     │                              │
│  API Client: lib/api.js      │     │  AI Engine:                  │
│                              │     │    Intent Classifier         │
└──────────────────────────────┘     │    Context Builder           │
                                     │    Rules Engine (16 rules)   │
                                     │    Response Generator        │
                                     │                              │
                                     │  SQLite (sql.js / WASM)      │
                                     │    users, activity_logs,     │
                                     │    habits, chat_history      │
                                     └──────────────────────────────┘
```

### Request Flow Example: Logging an Activity

1. User selects category "Transport" → type "Car (Gasoline)" → enters "50 km"
2. Frontend shows live preview: `50 × 0.21 = 10.5 kg CO₂`
3. On submit → `POST /api/activities` with JWT
4. Backend validates inputs, calculates CO₂ via `carbon-calculator.js`
5. Stores in `activity_logs` table, returns calculated result
6. Frontend optimistically updates state, refreshes summary
7. Dashboard and charts update in real-time

### Request Flow Example: AI Chat

1. User types "I drove 30 km today" in the chat widget
2. `POST /api/chat` sends message to backend
3. **Intent Classifier** detects `log_activity` intent, extracts `{quantity: 30, activity_hint: 'car'}`
4. **Context Builder** queries all user data into a rich context object
5. **Response Generator** maps `car` hint to `car_gasoline`, calculates `6.3 kg CO₂`
6. Returns: `"I can log that! 30 km of driving = 6.3 kg CO₂. Add to your log?"` + action button
7. User clicks action button → `POST /api/chat/action` → activity is logged
8. Chat shows confirmation: `"✅ Logged 6.3 kg CO₂ from car_gasoline"`

---

## 🧮 Assumptions Made

### Carbon Calculation Emission Factors

| Category | Activity | Factor | Unit | Source |
|----------|----------|--------|------|--------|
| Transport | Car (Gasoline) | 0.21 kg CO₂ | per km | DEFRA 2023 |
| Transport | Car (Diesel) | 0.27 kg CO₂ | per km | DEFRA 2023 |
| Transport | Car (Electric) | 0.05 kg CO₂ | per km | IEA avg |
| Transport | Bus | 0.089 kg CO₂ | per km | DEFRA 2023 |
| Transport | Train | 0.041 kg CO₂ | per km | DEFRA 2023 |
| Transport | Subway/Metro | 0.031 kg CO₂ | per km | DEFRA 2023 |
| Transport | Motorcycle | 0.103 kg CO₂ | per km | DEFRA 2023 |
| Transport | Flight (Domestic) | 0.255 kg CO₂ | per km | DEFRA 2023 |
| Transport | Flight (International) | 0.195 kg CO₂ | per km | DEFRA 2023 |
| Energy | Electricity | 0.42 kg CO₂ | per kWh | IEA Global Avg |
| Energy | Natural Gas | 2.0 kg CO₂ | per m³ | EPA |
| Energy | Heating Oil | 2.96 kg CO₂ | per litre | EPA |
| Food | Red Meat | 6.61 kg CO₂ | per meal | Poore & Nemecek 2018 |
| Food | Poultry | 1.82 kg CO₂ | per meal | Poore & Nemecek 2018 |
| Food | Fish | 1.34 kg CO₂ | per meal | Poore & Nemecek 2018 |
| Food | Vegetarian | 0.51 kg CO₂ | per meal | Poore & Nemecek 2018 |
| Food | Vegan | 0.39 kg CO₂ | per meal | Poore & Nemecek 2018 |
| Waste | Landfill | 0.58 kg CO₂ | per kg | EPA WARM |
| Waste | Recycled | 0.03 kg CO₂ | per kg | EPA WARM |
| Shopping | Clothing | 15 kg CO₂ | per item | WRAP UK |
| Shopping | Electronics | 50 kg CO₂ | per item | WRAP UK |

### Regional Benchmarks (Monthly)
- **Global Average:** 333 kg CO₂/month (~4,000 kg/year)
- **US Average:** 1,333 kg CO₂/month (~16,000 kg/year)
- **EU Average:** 550 kg CO₂/month (~6,600 kg/year)
- **India Average:** 158 kg CO₂/month (~1,900 kg/year)
- **Sustainable Target:** 167 kg CO₂/month (~2,000 kg/year, Paris Agreement)

### Other Assumptions
- Default monthly carbon goal: 200 kg CO₂
- "Meal" unit represents an average single-person meal portion
- Electric vehicle factor uses global average grid mix
- Shopping factors represent average lifecycle emissions per item
- Habit savings estimates are monthly averages

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (includes npm)
- No separate database installation needed (SQLite is bundled)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd anitigravity-assistant-based-project

# Install all dependencies (root + server + client)
npm run install:all

# Copy environment file
cp .env.example server/.env
```

### Development

```bash
# Start both server and client concurrently
npm run dev
```

- **Backend API:** http://localhost:3001
- **Frontend App:** http://localhost:3000

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
cd server && npx jest --testPathPattern=carbon-calculator --verbose

# Run only integration tests
cd server && npx jest --testPathPattern=api --verbose
```

---

## 📁 Project Structure

```
├── package.json              # Root orchestration (concurrently)
├── .env.example              # Environment template
├── .gitignore
├── README.md
│
├── server/                   # Express.js Backend
│   ├── src/
│   │   ├── index.js          # App entry point + middleware
│   │   ├── db/
│   │   │   ├── connection.js # SQLite singleton
│   │   │   └── schema.js     # Table definitions
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT authentication
│   │   │   └── validate.js   # Input validation
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── activity.routes.js
│   │   │   ├── habits.routes.js
│   │   │   └── chat.routes.js
│   │   ├── ai/
│   │   │   ├── intent-classifier.js
│   │   │   ├── context-builder.js
│   │   │   ├── rules-engine.js
│   │   │   └── response-generator.js
│   │   └── utils/
│   │       └── carbon-calculator.js
│   └── tests/
│       ├── carbon-calculator.test.js
│       └── api.test.js
│
└── client/                   # Next.js 14 Frontend
    └── src/
        ├── app/
        │   ├── layout.js     # Root layout + Inter font
        │   ├── ClientLayout.js
        │   ├── globals.css   # Design system
        │   ├── page.js       # Landing page
        │   ├── login/page.js
        │   ├── register/page.js
        │   ├── dashboard/page.js
        │   ├── log/page.js
        │   ├── habits/page.js
        │   └── analytics/page.js
        ├── components/
        │   ├── Sidebar.js
        │   ├── ChatWidget.js
        │   ├── ChatMessage.js
        │   ├── ProgressRing.js
        │   └── charts/
        │       ├── EmissionsLineChart.js
        │       ├── CategoryBarChart.js
        │       └── BreakdownPieChart.js
        ├── context/
        │   ├── AuthContext.js
        │   └── AppContext.js
        └── lib/
            └── api.js
```

---

## 🔒 Security Measures

- **Helmet.js** — Sets security HTTP headers
- **bcryptjs** — Passwords hashed with 12 salt rounds
- **JWT** — Stateless authentication with configurable expiry
- **express-validator** — All inputs sanitized and validated
- **Rate Limiting** — 200 req/15min (API), 20 req/15min (auth)
- **CORS** — Restricted to configured client origin
- **SQL Injection Prevention** — All queries use parameterized statements
- **XSS Prevention** — Input escaping via express-validator

---

## 📊 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | ❌ | Register new user |
| POST | /api/auth/login | ❌ | Login |
| GET | /api/auth/me | ✅ | Get current user |
| PUT | /api/auth/profile | ✅ | Update profile |
| POST | /api/activities | ✅ | Log activity |
| GET | /api/activities | ✅ | List activities |
| GET | /api/activities/summary | ✅ | Get emission stats |
| GET | /api/activities/factors | ✅ | Get emission factors |
| DELETE | /api/activities/:id | ✅ | Delete activity |
| POST | /api/habits | ✅ | Create habit |
| GET | /api/habits | ✅ | List habits |
| PUT | /api/habits/:id | ✅ | Update habit |
| DELETE | /api/habits/:id | ✅ | Delete habit |
| POST | /api/chat | ✅ | Send message to AI |
| GET | /api/chat/history | ✅ | Get chat history |
| POST | /api/chat/action | ✅ | Execute AI action |
| GET | /api/chat/insights | ✅ | Get proactive insights |
| GET | /api/health | ❌ | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 19, Tailwind CSS 4 |
| Charts | Recharts |
| Backend | Express.js 4, Node.js 18+ |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Testing | Jest + Supertest |
| Security | Helmet, express-rate-limit, express-validator |

---

## 📄 License

MIT