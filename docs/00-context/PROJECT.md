# Project context

SecureDocs is an RMIT Hackathon document workspace based on the Flameblue screenshots in `docs/codex-handoff/screenshots/`. The source of truth for layout and interactions is `docs/codex-handoff/`.

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Node 24. `app/page.tsx` is the single-page demo interface. API handlers live in `app/api/`.

Local commands: `npm.cmd ci`, `npm.cmd run dev`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test`, `npm.cmd run test:e2e`. The browser tests use installed Microsoft Edge. No migration command is needed for the local JSON demo store.

Constraint: TideCloak is not integrated. The demo is never a place for private documents.
