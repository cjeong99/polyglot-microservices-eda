# Polyglot Microservices EDA (Ride-hailing Demo)

This project is a learning + rebuild version of an **event-driven microservices architecture** inspired by:
- GitHub: event-driven-microservice-architecture
- YouTube walkthrough by the author

The final goal is to rebuild a ride-hailing web app using:
- API Gateway
- Kafka-compatible event broker (Redpanda)
- Polyglot microservices
- DB-per-service design
- Observability

---

## Architecture (Current)

### Core Flow
Client → Ride Service (HTTP API) → Postgres write → Publish event → (future consumers)

### Services running (Docker Compose)
- **PostgreSQL** (single DB for now)
- **pgAdmin** (DB browser UI)
- **Redpanda** (Kafka-compatible broker)
- **Redpanda Console** (Kafka UI)
- **ride-service** (Node.js / Express) → produces `ride.requested`

---

## Tech Stack

### Infrastructure
- Docker / Docker Compose
- PostgreSQL
- pgAdmin
- Redpanda + Console

### Microservices (planned, aligned with original repo)
| Service | Framework | Language |
|--------|-----------|----------|
| Ride Service | NestJS | Node.js (TypeScript) |
| Payment Service | NestJS | Node.js (TypeScript) |
| Notification Service | NestJS | Node.js (TypeScript) |
| Vehicle Service | .NET 10 | C# |
| User Service | FastAPI | Python |

Frontend (planned):
- Next.js + Mapbox + Auth0
- API Gateway integration

---

## Prerequisites
- Docker Desktop
- Node.js (20+ recommended)
- pnpm

---

## Quick Start

### Start the full stack
From project root:

```bash
cd ~/Documents/Projects/polyglot-microservices-eda
docker compose up -d --build
