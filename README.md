# Allens Lane Registration Platform

The all-in-one web platform for Allens Lane Art Center classes, summer camp, commerce, memberships, giving, reporting, and future native ticketing.

## Stack

- Next.js 16 / React 19
- Vercel hosting and Preview deployments
- Supabase for authentication, database, and private file storage
- Stripe for future payment processing

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase URL and publishable key for the development project.
3. Run `npm install` and then `npm run dev`.

## Quality checks

```bash
npm run lint
npm run build
```

Project planning and phased acceptance criteria live in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).
