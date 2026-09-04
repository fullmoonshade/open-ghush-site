# Contributing

## Before opening a change

1. Use synthetic report data only.
2. Never include production credentials, project references, database exports, screenshots containing allegations, or personal information.
3. Discuss schema, privacy, moderation, or telemetry changes in an issue before implementation.
4. Report vulnerabilities privately according to `SECURITY.md`.

## Development

```bash
npm ci
npx supabase start
npx supabase db reset
cp .env.example .env.local
npm run lint
npm test
npm run build
```

Every database change must be an ordered migration. Test the full migration chain from an empty local database. Security-definer functions must use an empty `search_path`, schema-qualified identifiers, explicit privileges, and the narrowest possible execution roles.

## Pull requests

- Explain the user-visible behavior and privacy impact.
- Include tests for new observable contracts and security boundaries.
- Keep public API responses free of unpublished fields and precise timestamps.
- Preserve bilingual English and Bengali behavior.
- Confirm lint, tests, build, and migration replay pass.
- Do not weaken moderation, RLS, origin validation, rate limiting, or security headers to make a test pass.

Unless explicitly stated otherwise, contributions submitted for inclusion are licensed under Apache License 2.0.
