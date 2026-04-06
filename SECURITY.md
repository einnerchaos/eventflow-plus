# Security

## Reporting issues

If you discover a security vulnerability, please open a **private** advisory on GitHub (or contact the maintainer directly) instead of filing a public issue.

## Secrets

- Never commit `.env` or real API keys. Use `.env.example` as a template only.
- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `API_KEY_SALT` before any public deployment.

## Demo / local defaults

Docker Compose and seed data use **development-only** credentials (e.g. default admin user). Replace all of these for production.
