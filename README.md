# Open GhushSite

Privacy-first, crowdsourced transparency ledger for anonymous, unverified reports of alleged unofficial bribery payment demands in Bangladesh.

This repository contains the application and reproducible Supabase schema. It does **not** contain production reports, moderation exports, credentials, analytics identifiers, or investigative evidence.

## Security model

- No accounts or identity fields are required for reporting.
- Browser writes go through same-origin Next.js route handlers.
- A server-only Supabase service-role key performs protected writes.
- Public database roles can read only published reports.
- Reports enter the database as unpublished with `review_status = 'pending'`.
- A database constraint prevents publication unless `review_status = 'approved'`.
- Obvious names, addresses, contact details, URLs, and identifying numbers are rejected before insertion; human moderation remains required.
- Request IPs are reduced to one-way, weekly rotating HMAC rate-limit keys and are never stored raw in report content.
- Public timestamps are rounded to the hour to reduce correlation risk.
- Third-party analytics and support widgets are disabled by default.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and operational risks.

## Architecture

```text
Browser
  ├─ GET /api/reports ──────────────── public Supabase client + RLS
  ├─ GET /api/reports/summary ──────── indexed aggregate RPC
  ├─ POST /api/reports ─────────────── validation + rate limit + moderation queue
  └─ POST /api/reports/confirm ─────── validation + rate limit + protected RPC

Supabase
  ├─ bribe_reports                    report content and moderation state
  ├─ abuse_rate_limits                short-lived hashed rate-limit counters
  ├─ list_hot_reports()               server-side hot ranking and pagination
  └─ get_public_report_summary()      compact public aggregates
```

## Requirements

- Node.js 20.9 or newer
- npm
- Supabase CLI
- Docker Desktop or another Docker-compatible runtime for local Supabase

## Local development

```bash
npm ci
npx supabase start
npx supabase db reset
cp .env.example .env.local
npm run dev
```

Fill `.env.local` using values printed by `supabase status`. Local database seeding is disabled; do not use production allegations as fixtures.

## Environment variables

Required:

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Publishable/anonymous read key |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical browser-visible site origin |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Protected inserts and mutations |
| `RATE_LIMIT_HMAC_SECRET` | Server only | At least 32 random characters |
| `APP_ORIGIN` | Server only | Exact browser-visible origin accepted for writes |

On Vercel, trusted client addressing is supplied by `@vercel/functions`. Outside Vercel, set `TRUSTED_CLIENT_IP_HEADER` to a header that your reverse proxy **overwrites** and that clients cannot inject. Writes fail closed when no trusted client address is available.

Optional and disabled by default:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Enable Cloudflare Web Analytics |
| `NEXT_PUBLIC_SUPPORTKORI_ID` | Enable the SupportKori widget |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Add Google verification metadata |
| `NEXT_PUBLIC_SUPPORTKORI_URL` | Enable the Bangladesh support link |
| `NEXT_PUBLIC_DONATION_URL` | Enable the international support link |
| `NEXT_PUBLIC_FEATURE_REQUEST_URL` | Enable the external feature-request link |
| `NEXT_PUBLIC_PRESS_URL` | Enable an external press-coverage link |

Operators enabling third-party services must update their deployment privacy notice.

## Supabase

Create a new Supabase project, then either run locally or link your own project:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push --dry-run
npx supabase db push
```

Never link a contributor checkout to the upstream production project. Never commit `supabase/.temp`, database passwords, service-role keys, or exported reports.

## Moderation

Publication is an operational decision, not a public API capability. Moderators must reject or hold reports containing:

- Personal names or identifying role/location combinations
- Exact addresses, phone numbers, email addresses, URLs, or identifiers
- Threats, abuse, test data, gibberish, duplicates, or off-topic content

Approval must update `review_status = 'approved'` and `is_published = true` atomically. Reports are unverified allegations and must never be presented as findings of guilt.

## Commands

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Deployment

The reference deployment target is Vercel. Configure every required environment variable for Production, Preview, and Development. No custom build command or output directory is needed.

For another host, configure `APP_ORIGIN`, place the application behind a trusted reverse proxy, set `TRUSTED_CLIENT_IP_HEADER`, and ensure the proxy strips client-supplied copies of that header.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Licensing

Application source code is licensed under [Apache License 2.0](LICENSE). Production report data, user submissions, personal information, investigative exports, project branding, and third-party media are not licensed as open-source code. See [DATA_POLICY.md](DATA_POLICY.md), [ASSET_LICENSES.md](ASSET_LICENSES.md), and [TRADEMARKS.md](TRADEMARKS.md).
