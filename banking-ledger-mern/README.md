# LedgerX — MERN Banking Ledger System

A production-ready banking ledger system built with MongoDB, Express.js, React.js, and Node.js implementing **double-entry accounting** principles.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Ledger Logic](#ledger-logic)
4. [Folder Structure](#folder-structure)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Sample curl Commands](#sample-curl-commands)
9. [Security Features](#security-features)

---

## Architecture Overview

```
┌─────────────────────┐      HTTP/REST      ┌──────────────────────┐
│   React Frontend    │ ◄──────────────────► │  Express.js Backend  │
│  (Port 3000)        │                      │  (Port 5000)         │
└─────────────────────┘                      └──────────┬───────────┘
                                                        │ Mongoose
                                                        ▼
                                             ┌──────────────────────┐
                                             │      MongoDB         │
                                             │  (Port 27017)        │
                                             └──────────────────────┘
```

**Backend MVC Structure:**
- **Models** — Mongoose schemas (User, Account, Transaction, LedgerEntry, AuditLog)
- **Controllers** — Business logic (auth, accounts, transactions, admin)
- **Routes** — RESTful route definitions with middleware chains
- **Middleware** — JWT auth, validation, error handling, rate limiting

---

## Database Schema

### User
| Field       | Type     | Notes                        |
|-------------|----------|------------------------------|
| firstName   | String   | Required                     |
| lastName    | String   | Required                     |
| email       | String   | Unique, indexed              |
| password    | String   | Bcrypt hashed, never returned|
| role        | String   | `admin` \| `customer`        |
| isActive    | Boolean  | Soft delete support          |
| lastLogin   | Date     | Updated on each login        |

### Account
| Field         | Type     | Notes                          |
|---------------|----------|--------------------------------|
| accountNumber | String   | Auto-generated, unique         |
| accountType   | String   | `checking` \| `savings` \| `business` |
| owner         | ObjectId | Ref → User                     |
| currency      | String   | Default `USD`                  |
| isActive      | Boolean  | Cannot deactivate with balance |

> ⚠️ **Balance is NEVER stored on Account.** It is always derived from LedgerEntry aggregation.

### Transaction
| Field           | Type     | Notes                              |
|-----------------|----------|------------------------------------|
| referenceNumber | String   | Auto-generated `TXNYYYYMMDDxxxxxx` |
| type            | String   | `deposit` \| `withdrawal` \| `transfer` |
| account         | ObjectId | Primary (source) account           |
| toAccount       | ObjectId | Destination (transfers only)       |
| amount          | Number   | Always positive                    |
| status          | String   | `pending` → `completed` \| `failed` |
| balanceBefore   | Number   | Snapshot at transaction time       |
| balanceAfter    | Number   | Snapshot at transaction time       |
| initiatedBy     | ObjectId | Ref → User                         |

### LedgerEntry
| Field          | Type     | Notes                              |
|----------------|----------|------------------------------------|
| transaction    | ObjectId | Parent transaction                 |
| account        | ObjectId | Account this entry affects         |
| entryType      | String   | `debit` \| `credit`               |
| amount         | Number   | Always positive                    |
| runningBalance | Number   | Account balance after this entry   |
| sequence       | Number   | Order within transaction           |

---

## Ledger Logic

LedgerX uses **double-entry accounting**. Every financial event creates balanced entries:

### Deposit ($1000 into Account A)
```
Entry 1: DEBIT  Account A  $1000  (money in — asset increases)
Entry 2: CREDIT Account A  $1000  (balancing external source entry)
Net effect on balance: +$1000
```

### Withdrawal ($200 from Account A)
```
Entry 1: CREDIT Account A  $200   (money out — asset decreases)
Entry 2: DEBIT  Account A  $200   (balancing external destination)
Net effect on balance: −$200
```

### Transfer ($500 from Account A → Account B)
```
Entry 1: CREDIT Account A  $500   (A loses money)
Entry 2: DEBIT  Account B  $500   (B gains money)
Entry 3: DEBIT  Account A  $500   (settlement debit on A)
Entry 4: CREDIT Account B  $500   (settlement credit on B)
Total debits = Total credits = $1000 ✓
```

**Balance Computation:**
```
Balance = Σ(DEBIT amounts) − Σ(CREDIT amounts)
```

All transaction operations use **MongoDB sessions** for atomicity — if any step fails, the entire operation is rolled back.

---

## Folder Structure

```
banking-ledger/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Register, login, getMe
│   │   ├── accountController.js  # CRUD for accounts
│   │   ├── transactionController.js  # Deposit, withdraw, transfer, history
│   │   └── adminController.js    # Admin dashboard, users, audit
│   ├── middleware/
│   │   ├── auth.js               # JWT protect & authorize middleware
│   │   ├── errorHandler.js       # Global error + 404 handler
│   │   └── validators.js         # express-validator rules
│   ├── models/
│   │   ├── User.js
│   │   ├── Account.js
│   │   ├── Transaction.js
│   │   ├── LedgerEntry.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── accounts.js
│   │   ├── transactions.js
│   │   └── admin.js
│   ├── utils/
│   │   ├── ledger.js             # Double-entry accounting functions
│   │   ├── response.js           # Standardized API responses
│   │   ├── audit.js              # Audit log helper
│   │   └── seeder.js             # Dev seed script
│   ├── .env.example
│   ├── package.json
│   └── server.js                 # Express app entry point
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── auth/
│       │   │   ├── Login.js
│       │   │   ├── Register.js
│       │   │   └── Auth.css
│       │   ├── common/
│       │   │   ├── Sidebar.js / Sidebar.css
│       │   │   ├── UI.js          # Shared components + helpers
│       │   │   └── PrivateRoute.js
│       │   ├── dashboard/
│       │   │   ├── Dashboard.js
│       │   │   ├── AdminUsers.js
│       │   │   └── AuditLogs.js
│       │   ├── accounts/
│       │   │   ├── Accounts.js
│       │   │   └── Accounts.css
│       │   └── transactions/
│       │       ├── Transactions.js  # History + filters + detail modal
│       │       └── Transfer.js      # Deposit / withdraw / transfer UI
│       ├── context/
│       │   └── AuthContext.js     # Global auth state (useReducer)
│       ├── services/
│       │   └── api.js             # Axios instance + all API calls
│       ├── App.js                 # Router + route definitions
│       ├── index.js
│       └── index.css              # Global design system
│
├── LedgerX_API.postman_collection.json
├── package.json                   # Root scripts (concurrently)
├── .gitignore
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18.x
- MongoDB running locally (or MongoDB Atlas URI)
- npm ≥ 9.x

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd banking-ledger

# Install all dependencies (root + backend + frontend)
npm run install:all
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/banking_ledger
JWT_SECRET=your_super_secret_key_at_least_32_chars
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

### 3. Seed the database (optional but recommended)

```bash
npm run seed
```

This creates:
- **Admin:**    `admin@bank.com`    / `Admin@12345`
- **Customer:** `alice@example.com` / `Alice@12345`
- **Customer:** `bob@example.com`   / `Bob@12345`

### 4. Run in development

```bash
# From root — starts both backend (port 5000) and frontend (port 3000)
npm run dev

# Or run separately:
npm run dev:backend
npm run dev:frontend
```

Open **http://localhost:3000** in your browser.

---

## Environment Variables

| Variable              | Required | Default     | Description                     |
|-----------------------|----------|-------------|---------------------------------|
| NODE_ENV              | No       | development | Environment mode                |
| PORT                  | No       | 5000        | Backend server port             |
| MONGO_URI             | **Yes**  | —           | MongoDB connection string       |
| JWT_SECRET            | **Yes**  | —           | Min 32-char secret for JWT      |
| JWT_EXPIRE            | No       | 7d          | Token expiry (7d, 24h, etc.)    |
| CLIENT_URL            | No       | localhost:3000 | CORS allowed origin          |
| RATE_LIMIT_WINDOW_MS  | No       | 900000      | Rate limit window (15 min)      |
| RATE_LIMIT_MAX        | No       | 100         | Max requests per window         |

---

## API Reference

### Base URL: `http://localhost:5000/api`

### Auth
| Method | Endpoint              | Auth     | Description            |
|--------|-----------------------|----------|------------------------|
| POST   | `/auth/register`      | Public   | Register new customer  |
| POST   | `/auth/login`         | Public   | Login, receive JWT     |
| GET    | `/auth/me`            | JWT      | Get current user       |
| POST   | `/auth/admin/register`| Admin    | Create admin user      |

### Accounts
| Method | Endpoint          | Auth     | Description               |
|--------|-------------------|----------|---------------------------|
| GET    | `/accounts`       | JWT      | List user accounts        |
| POST   | `/accounts`       | JWT      | Create new account        |
| GET    | `/accounts/:id`   | JWT      | Get account + balance     |
| PUT    | `/accounts/:id`   | JWT      | Update description        |
| DELETE | `/accounts/:id`   | Admin    | Deactivate account        |

### Transactions
| Method | Endpoint                          | Auth  | Description                  |
|--------|-----------------------------------|-------|------------------------------|
| POST   | `/transactions/deposit/:accountId`  | JWT | Deposit funds                |
| POST   | `/transactions/withdraw/:accountId` | JWT | Withdraw funds               |
| POST   | `/transactions/transfer/:accountId` | JWT | Transfer to another account  |
| GET    | `/transactions/history/:accountId`  | JWT | Paginated history + filters  |
| GET    | `/transactions/detail/:txId`        | JWT | Detail + ledger entries      |

**History query params:** `page`, `limit`, `type`, `status`, `search`, `startDate`, `endDate`, `sortBy`, `sortOrder`

### Admin (admin role required)
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/admin/dashboard`                | Stats overview           |
| GET    | `/admin/users`                    | List all users           |
| PUT    | `/admin/users/:id/toggle-status`  | Activate/deactivate user |
| GET    | `/admin/audit-logs`               | Paginated audit trail    |

---

## Sample curl Commands

```bash
BASE=http://localhost:5000/api

# 1. Login and capture token
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Alice@12345"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: $TOKEN"

# 2. Create a checking account
ACCOUNT=$(curl -s -X POST $BASE/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountType":"checking","description":"My main account"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['account']['_id'])")

echo "Account ID: $ACCOUNT"

# 3. Deposit $5000
curl -s -X POST $BASE/transactions/deposit/$ACCOUNT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"description":"Initial deposit"}' | python3 -m json.tool

# 4. Withdraw $200
curl -s -X POST $BASE/transactions/withdraw/$ACCOUNT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":200,"description":"ATM withdrawal"}' | python3 -m json.tool

# 5. Get transaction history (paginated)
curl -s "$BASE/transactions/history/$ACCOUNT?page=1&limit=5&status=completed" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 6. Get account balance (derived from ledger)
curl -s $BASE/accounts/$ACCOUNT \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 7. Admin: view audit logs
ADMIN_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bank.com","password":"Admin@12345"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s "$BASE/admin/audit-logs?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
```

---

## Security Features

| Feature              | Implementation                                      |
|----------------------|-----------------------------------------------------|
| Password hashing     | bcrypt with salt rounds = 12                        |
| JWT authentication   | HS256, configurable expiry, stored in localStorage  |
| Rate limiting        | 100 req / 15 min per IP via express-rate-limit      |
| Helmet               | Secure HTTP headers                                 |
| Input validation     | express-validator on all mutation endpoints         |
| CORS                 | Whitelist via CLIENT_URL env var                    |
| Atomic transactions  | MongoDB sessions for all financial operations       |
| Ledger integrity     | Debit/credit balance verified after every tx        |
| Audit trail          | All sensitive actions logged with IP + user agent   |
| Password not exposed | `select: false` on password field in User schema    |
| Body size limit      | 10kb max request body                               |

---

## Key Design Decisions

1. **Balance never stored** — computed via MongoDB aggregation on LedgerEntry. This prevents drift and is the correct accounting approach.

2. **MongoDB sessions** — All deposit/withdraw/transfer operations use `session.startTransaction()` / `session.commitTransaction()` so partial writes never happen.

3. **Ledger integrity check** — After creating entries, `verifyTransactionBalance()` confirms `Σdebits === Σcredits`. If it fails, the session is aborted.

4. **Soft deletes** — Accounts and users use `isActive` flags, never hard-deleted, preserving the audit trail.

5. **Role middleware** — `authorize('admin')` can be stacked with `protect` on any route, making role escalation impossible.

6. **Context API** — Frontend state management uses `useReducer` + React Context, avoiding Redux complexity while maintaining predictability.
