# Aifennec Hub

Motor central de la agencia Aifennec. Módulos:

- `linkedin-ideas` — scrape diario de posts virales de LinkedIn → Google Sheet + Telegram digest

## Quick start

```bash
pnpm install
cp .env.example .env
# Llenar .env con credenciales
pnpm migrate
pnpm scrape:once  # test manual
pnpm dev          # cron en vivo
```

Ver `docs/superpowers/specs/` para diseño detallado.
