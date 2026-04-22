# Resolution Frontend

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - TypeScript/Svelte type checking
- `npx drizzle-kit generate` - Generate Drizzle migrations
- `npx drizzle-kit push` - Push schema changes to database

## Architecture

- **Framework**: SvelteKit 2 with Svelte 5, TypeScript, adapter-auto (for Vercel deployment)
- **Database**: PostgreSQL via Drizzle ORM (`src/lib/server/db/schema.ts`)
- **Auth**: Lucia authentication with Hack Club OAuth (`$lib/server/auth/`)
- **Routes**: `(onboarding)/`, `app/`, `auth/`, `api/` - SvelteKit file-based routing
- **Components**: `$lib/components/`, styles in `$lib/styles/`, types in `$lib/types/`

## Code Style
- Use camelCase for variables/functions
- Import from `$lib/` alias (e.g., `$lib/server/prisma`)
- Server-only code in `$lib/server/` or `+page.server.ts`/`+server.ts`
- Use Zod for validation (`$lib/server/validation.ts`)
- No box-shadows or gradients in CSS unless explicitly requested
