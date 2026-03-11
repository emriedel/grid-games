# @grid-games/database

Database package for storing game scores using PostgreSQL and Prisma.

## Local Development Setup

### Prerequisites

- Docker Desktop installed and running

### 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

This starts PostgreSQL on port 5433 (to avoid conflicts with other projects).

### 2. Configure Environment

Create `packages/database/.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/grid_games"
```

Create/update `apps/web/.env.local`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/grid_games"
```

### 3. Initialize Database

```bash
cd packages/database
npx prisma db push      # Create tables from schema
npx prisma generate     # Generate Prisma client
```

### 4. Start Dev Servers

```bash
# Terminal 1: Web app (hosts /api/scores)
npx turbo dev --filter=@grid-games/web

# Terminal 2: Game app (e.g., Dabble)
npx turbo dev --filter=@grid-games/dabble
```

## Useful Commands

```bash
# View/edit database in browser
npx prisma studio

# Reset database (delete all data)
npx prisma db push --force-reset

# Stop PostgreSQL
docker compose down

# Stop and delete data volume
docker compose down -v
```

## API Endpoints

The web app exposes `/api/scores`:

```bash
# Get top scores
curl "http://localhost:3000/api/scores?gameId=dabble&puzzleId=abc123"

# Submit a score
curl -X POST "http://localhost:3000/api/scores" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"dabble","puzzleId":"abc123","puzzleNumber":1,"score":500}'
```

## Schema

See `prisma/schema.prisma` for the data model.
