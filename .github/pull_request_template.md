## Change

Describe the observable behavior and why it is needed.

## Privacy and security

- [ ] Uses synthetic data only; no real allegations or personal information
- [ ] Adds no credentials, project identifiers, analytics IDs, or database exports
- [ ] Preserves RLS, moderation, origin checks, rate limiting, and timestamp protections
- [ ] Documents any new third-party network request

## Verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Full local Supabase migration replay, when schema changed
