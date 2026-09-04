# Security Policy

## Reporting a vulnerability

Use GitHub's private **Security advisories → Report a vulnerability** flow for this repository. Do not open a public issue for vulnerabilities, leaked credentials, unpublished reports, personal information, or methods that could identify a reporter.

Include the affected component, reproduction steps, impact, and the minimum information needed to verify the issue. Never include real report content or personal data; use synthetic examples.

Maintainers will acknowledge a complete report as capacity permits, investigate privately, and coordinate disclosure after a fix is available. Do not access, modify, download, or publish data beyond what is necessary to demonstrate the issue.

## Supported version

Security fixes are applied to the current default branch. Older commits and forks are not supported.

## Deployment responsibilities

Operators must use their own Supabase project and secrets, preserve RLS and moderation constraints, configure an exact `APP_ORIGIN`, and use a trusted client-IP source for abuse controls. Third-party integrations are disabled by default and require deployment-specific privacy disclosure when enabled.
