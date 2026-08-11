# Poolboy Architecture

Poolboy is a water chemistry tracking and treatment recommendation app for chlorine and saltwater pools.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | [SvelteKit](https://svelte.dev/docs/kit) | Full-stack framework with SSR, routing, and form actions |
| UI | [Svelte 5](https://svelte.dev) | Reactive components with runes (`$state`, `$derived`, `$props`) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) | Utility-first CSS framework |
| Database | [SQLite](https://sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Embedded relational database |
| ORM | [Drizzle ORM](https://orm.drizzle.team) | Type-safe SQL query builder and schema management |
| Testing | [Vitest](https://vitest.dev) | Unit testing framework |
| Linting | ESLint + Prettier | Code quality and formatting |

## Project Structure

```
poolboy/
├── docs/                    # Documentation
├── src/
│   ├── lib/
│   │   ├── calculations.ts      # Treatment recommendation engine
│   │   ├── calculations.test.ts # Unit tests for calculations
│   │   ├── index.ts             # Library exports
│   │   └── server/
│   │       └── db/
│   │           ├── index.ts     # Database connection
│   │           └── schema.ts    # Drizzle schema definitions
│   └── routes/
│       ├── +layout.svelte       # Root layout
│       ├── +page.svelte         # Dashboard (pool list)
│       ├── +page.server.ts      # Dashboard data loading & actions
│       └── pool/[id]/
│           ├── +page.svelte     # Pool detail view
│           ├── +page.server.ts  # Pool data loading
│           └── test/
│               ├── +page.svelte     # Test logging form
│               └── +page.server.ts  # Save test action
├── local.db                 # SQLite database file
├── drizzle.config.ts        # Drizzle ORM configuration
├── svelte.config.js         # SvelteKit configuration
├── vite.config.ts           # Vite build configuration
└── package.json
```

## Database Schema

### Tables

#### `pools`
Stores pool configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (UUID) | Primary key |
| `name` | TEXT | Pool display name |
| `type` | TEXT | `'chlorine'` or `'saltwater'` |
| `volume_gallons` | INTEGER | Pool volume in gallons |
| `created_at` | INTEGER (timestamp) | Creation date |

#### `water_tests`
Stores water chemistry test readings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (UUID) | Primary key |
| `pool_id` | TEXT | Foreign key to pools |
| `tested_at` | INTEGER (timestamp) | Test date/time |
| `free_chlorine` | REAL | Free chlorine (ppm) |
| `total_chlorine` | REAL | Total chlorine (ppm) |
| `ph` | REAL | pH level |
| `alkalinity` | INTEGER | Total alkalinity (ppm) |
| `cyanuric_acid` | INTEGER | Stabilizer/CYA (ppm) |
| `calcium` | INTEGER | Calcium hardness (ppm) |
| `salt` | INTEGER | Salt level (ppm) |
| `temperature` | INTEGER | Water temperature (°F) |
| `notes` | TEXT | Optional notes |

#### `treatments`
Stores applied chemical treatments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (UUID) | Primary key |
| `pool_id` | TEXT | Foreign key to pools |
| `water_test_id` | TEXT | Optional foreign key to water_tests |
| `applied_at` | INTEGER (timestamp) | Application date/time |
| `chemical` | TEXT | Chemical name |
| `amount` | REAL | Amount applied |
| `unit` | TEXT | Unit of measurement |
| `notes` | TEXT | Optional notes |

## Key Components

### Calculation Engine (`src/lib/calculations.ts`)

The calculation engine provides three main functions:

1. **`getRanges(poolType)`**
   - Returns ideal chemistry ranges for the given pool type
   - Merges common ranges with pool-type-specific overrides
   - Chlorine and saltwater pools have different alkalinity, CYA, and salt ranges

2. **`calculateRecommendations(readings, volumeGallons, poolType)`**
   - Takes current water test readings
   - Returns prioritized list of treatment recommendations
   - Scales dosing amounts based on pool volume
   - Uses pool-type-specific ranges for calculations

3. **`getReadingStatus(value, range)`**
   - Returns status for a reading: `'good'`, `'warning'`, `'danger'`, or `'unknown'`
   - Used for color-coding readings in the UI

### Server Actions

SvelteKit form actions handle data mutations:

- `?/createPool` - Create a new pool
- `?/deletePool` - Delete a pool and cascade to tests/treatments
- `POST /pool/[id]/test` - Log a new water test

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  SvelteKit   │────▶│   SQLite    │
│  (Svelte)   │◀────│   Server     │◀────│  (Drizzle)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌──────────────┐
       └──────────▶│ Calculations │
                   │    Engine    │
                   └──────────────┘
```

1. User loads dashboard → Server queries pools + latest tests
2. User logs test → Form action saves to database → Redirects to pool detail
3. Pool detail page → Server loads tests → Client calculates recommendations

## Development Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test           # Watch mode
npm run test:run   # Single run

# Database
npm run db:push    # Push schema changes
npm run db:studio  # Open Drizzle Studio GUI

# Code quality
npm run check      # TypeScript check
npm run lint       # ESLint + Prettier
npm run format     # Auto-format code

# Build
npm run build
npm run preview
```

## Deployment

The app uses `@sveltejs/adapter-auto` which auto-detects deployment targets:

- **Vercel** - Zero config, SQLite persists in serverless function (ephemeral)
- **Node.js** - Use `adapter-node` for persistent SQLite
- **Static** - Not suitable (requires server for database)

For production with persistent data, consider:
- Turso (libSQL) for edge-compatible SQLite
- PostgreSQL with Drizzle's PostgreSQL adapter
