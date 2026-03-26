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
npm run db:migrate:dev    # Apply migrations and generate client
```

### 4. Start Dev Servers

```bash
# Terminal 1: Web app (hosts /api/scores)
npx turbo dev --filter=@grid-games/web

# Terminal 2: Game app (e.g., Dabble)
npx turbo dev --filter=@grid-games/dabble
```

## Schema Changes (Migration Workflow)

This project uses **Prisma Migrate** for schema changes. Migrations are version-controlled
and automatically applied during deployment.

### Making Schema Changes

1. **Edit the schema:**
   ```bash
   # Edit prisma/schema.prisma with your changes
   ```

2. **Create a migration:**
   ```bash
   cd packages/database
   npm run db:migrate:dev
   # Enter a name like "add_user_table" when prompted
   ```
   This creates a migration file in `prisma/migrations/` and applies it locally.

3. **Commit and push:**
   ```bash
   git add prisma/migrations
   git commit -m "Add user table migration"
   git push
   ```

4. **Production:** Migrations are automatically applied during Vercel builds via `build:prod` in `apps/web`.

### Commands

| Command | Purpose |
|---------|---------|
| `npm run db:migrate:dev` | Create and apply migrations (local dev) |
| `npm run db:migrate:deploy` | Apply pending migrations (production) |
| `npm run db:migrate:status` | Check migration status |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | View/edit database in browser |
| `npm run db:reset` | Reset database and reapply all migrations |

### Production Notes

- **Vercel builds** run `build:prod` which executes `prisma generate && prisma migrate deploy && next build`
- Since this is a monorepo, the `--schema=../../packages/database/prisma/schema.prisma` path is required
- Migrations use the **direct connection** (not pooled) for DDL operations
- The pooled connection is used for runtime queries

### Monorepo Note

When running Prisma commands from outside `packages/database/`, specify the schema path:

```bash
# From apps/web
prisma generate --schema=../../packages/database/prisma/schema.prisma

# Or cd into the database package first
cd packages/database && npx prisma migrate dev
```

## Useful Commands

```bash
# View/edit database in browser
npx prisma studio

# Check migration status
npm run db:migrate:status

# Reset local database (deletes all data)
npm run db:reset

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
