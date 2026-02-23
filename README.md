# Syncora — Production-Grade Real-Time Chat

A full-stack, production-ready real-time chat application with direct messaging, group chats, @mentions, typing indicators, read receipts, and notifications.

## Project Overview

Syncora provides a modern chat experience with:

- **Direct & group messaging** — Create rooms, add/remove members, promote admins
- **Real-time updates** — Socket.io for instant delivery, typing, and presence
- **Rich features** — @mentions, reactions, reply/forward, message editing
- **Notifications** — Unread counts, notification dropdown, optional sound
- **Security** — JWT auth, rate limiting, XSS protection, input validation

---

## Architecture

```
syncora/
├── backend/                   # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── config/            # Database, Socket (JWT auth, room join)
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── middleware/        # Auth, validation, upload, error handling
│   │   ├── models/            # User, Room, Message, RoomReadStatus
│   │   ├── routes/            # Auth, chat, user API
│   │   ├── services/          # Business logic
│   │   └── utils/             # JWT, logger, sanitize, AppError
│   ├── Dockerfile
│   └── entrypoint.sh         # Create upload dirs at runtime
├── frontend/                  # Next.js 14 App Router
│   ├── src/
│   │   ├── app/               # Auth, chat layout, room, profile
│   │   ├── components/        # UI, chat, layout
│   │   ├── hooks/             # useAuth, useSocket
│   │   ├── lib/               # API client, Socket manager
│   │   ├── store/             # Zustand (auth, chat)
│   │   └── types/
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

**Data flow:**

- **REST API** — Auth, rooms, messages (paginated), user search
- **WebSocket** — Messages, typing, presence; clients join rooms via `room:join`
- **Optimistic UI** — Messages appear immediately, replaced by server response

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | Zustand |
| HTTP | Axios with token refresh interceptor |
| Backend | Node.js, Express.js |
| Real-time | Socket.io |
| Database | MongoDB 7, Mongoose |
| Auth | JWT (access + refresh), bcrypt |
| Security | Helmet, CORS, rate limiting, express-validator, sanitization |

---

## Setup Instructions

### Using Docker (recommended)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with JWT secrets

# 2. Start all services
docker-compose up --build

# Services:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:5001
# MongoDB:   localhost:27017
```

### Local development

**Prerequisites:** Node.js 20+, MongoDB 7

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | — | Min 32 chars for access token |
| `JWT_REFRESH_SECRET` | Yes | — | Min 32 chars for refresh token |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `CLIENT_URL` | No | http://localhost:3000 | Allowed CORS origin(s), comma-separated |
| `NEXT_PUBLIC_API_URL` | No | http://localhost:5001 | API URL (browser) |
| `NEXT_PUBLIC_SOCKET_URL` | No | http://localhost:5001 | Socket URL (browser) |
| `BCRYPT_ROUNDS` | No | 12 | bcrypt cost factor |
| `PORT` | No | 5000 | Backend port |

---

## Docker Setup

| Service | Image/Build | Purpose |
|---------|-------------|---------|
| **mongodb** | mongo:7.0 | Database; health-checked before backend |
| **backend** | ./backend/Dockerfile | Express + Socket.io; runs as non-root with entrypoint |
| **frontend** | ./frontend/Dockerfile | Next.js standalone; build args for API URL |

**Networking:** All services use `syncora-network`. Backend and frontend resolve `mongodb` and `backend` by hostname. The browser must reach the backend via the host (e.g. `localhost:5001`), so `NEXT_PUBLIC_*` use host URLs.

---

## Error Response Structure

All API errors return a consistent shape:

```json
{
  "status": "error",
  "message": "Human-readable error message"
}
```

| HTTP | Typical cause |
|------|----------------|
| 400 | Validation error, bad request |
| 401 | Invalid/expired token |
| 403 | Access denied |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 500 | Internal server error |

---

## Testing

```bash
cd backend
npm test           # Run tests with coverage
npm run test:watch # Watch mode
```

- **Unit tests** — Controller logic with mocked services
- **API tests** — Supertest against real routes; MongoDB Memory Server for DB
- **Coverage** — Excludes `server.ts` and test files

---

## Scaling Explanation

| Concern | Current approach | Scale-out options |
|---------|-----------------|-------------------|
| **API** | Single Node process | Horizontal: multiple instances behind load balancer; stateless |
| **Socket** | Single Socket.io server | Sticky sessions or Redis adapter for multi-instance |
| **DB** | Single MongoDB | Replica set; sharding for very large datasets |
| **Uploads** | Local volume | S3/MinIO; CDN for avatars |
| **Rate limit** | In-memory | Redis store for distributed limiting |

---

## Future Improvements

- [ ] **E2E tests** — Playwright/Cypress for critical flows
- [ ] **Media messages** — Image/file upload with thumbnails
- [ ] **Message search** — Full-text or Elasticsearch
- [ ] **Push notifications** — Web Push / mobile
- [ ] **Redis adapter** — Socket.io horizontal scaling
- [ ] **Read receipts** — Per-message read state
- [ ] **Voice/video** — WebRTC integration
