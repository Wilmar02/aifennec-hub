# LinkedIn Viral Ideas — Design Spec

**Fecha:** 2026-04-11
**Proyecto:** aifennec-hub
**Módulo:** `linkedin-ideas` (primer módulo del hub)
**Autor:** Wilmar Rocha (Aifennec LLC)
**Estado:** Aprobado para implementación

---

## 1. Objetivo

Generar diariamente, de forma automatizada, un feed de ideas de contenido viral para LinkedIn, validadas por engagement real, accesible para Wilmar y su asistente desde un Google Sheet compartido, con un digest matutino por Telegram.

**Por qué:** dejar que el contenido y la data descubran el ICP de Aifennec, en lugar de adivinar el buyer en frío. Es contenido-led discovery.

**Métrica de éxito v1:**
- Sistema corre 7 días seguidos sin intervención manual
- Sheet recibe ≥10 ideas nuevas por día
- Digest de Telegram llega entre 6:00–6:15 AM hora Colombia
- 0 duplicados en el Sheet

---

## 2. Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│  CRON (6:00 AM diario, node-cron en aifennec-hub)         │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  1. Proxycurl Client                                      │
│     • Lee seed list de 16 perfiles desde config           │
│     • Llama Person Profile + Person Posts endpoint        │
│     • Devuelve JSON estructurado por perfil               │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  2. Deduper (Postgres)                                    │
│     • Verifica post_url contra tabla linkedin_posts       │
│     • Filtra solo posts NUEVOS                            │
│     • Aplica filtro engagement (likes >= threshold)       │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  3. Classifier (Claude Haiku 4.5)                         │
│     • Clasifica tema (sales, automation, branding, etc.)  │
│     • Extrae hook (primera línea)                         │
│     • Detecta formato (texto/carrusel/video/poll)         │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  4. Persisters (paralelo)                                 │
│     ├─► Postgres INSERT (linkedin_posts)                  │
│     └─► Google Sheets API append rows                     │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  5. Digest (Telegram Bot)                                 │
│     • Top 10 posts del día por engagement_score           │
│     • Mensaje formateado con hooks + link al Sheet        │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| Runtime | Node.js | 22 LTS | Estándar de aifennec-hub |
| Lenguaje | TypeScript | 5.x | Tipado estricto |
| Scraping | **Proxycurl API** | latest | JSON limpio, $0.05/lookup, sin browsers |
| DB | PostgreSQL | 15+ (existente VPS) | Reusar instancia del VPS |
| Sheets | googleapis (oficial) | latest | Service Account auth |
| AI Classify | @anthropic-ai/sdk | latest | Claude Haiku 4.5 |
| Telegram | grammy | latest | Mismo stack que JohnVery/OVA |
| Scheduler | node-cron | latest | Standalone, dentro del proceso |
| HTTP | undici (built-in fetch) | nativo | Sin axios |
| Container | Docker | - | Easypanel deploy |
| Logger | pino | latest | JSON logs |
| Tests | vitest | latest | Match con stack OpenClaw |

**Lo que NO usamos (y por qué):**
- ❌ Crawlee / Playwright → sobre-ingeniería para 16 perfiles/día, requiere browser, frágil
- ❌ Apify → mismo motor que Crawlee pero más caro y devuelve HTML
- ❌ Redis → no necesitamos cache para este volumen (16 lookups/día)
- ❌ Express server → este módulo es solo cron + workers, sin API HTTP en v1

---

## 4. Estructura de carpetas

```
aifennec-hub/
├── src/
│   ├── modules/
│   │   └── linkedin-ideas/
│   │       ├── index.ts            ← Entry point del módulo (job runner)
│   │       ├── proxycurl.ts        ← Cliente HTTP a Proxycurl
│   │       ├── classifier.ts       ← Claude haiku para tema/hook/formato
│   │       ├── sheets.ts           ← Google Sheets API wrapper
│   │       ├── deduper.ts          ← Lógica de dedup contra Postgres
│   │       ├── digest.ts           ← Construcción + envío del digest Telegram
│   │       ├── seed-list.ts        ← Lista hardcoded de 16 perfiles
│   │       └── types.ts            ← Tipos compartidos del módulo
│   ├── db/
│   │   ├── connection.ts           ← Pool de Postgres
│   │   └── migrations/
│   │       └── 001_linkedin_posts.sql
│   ├── channels/
│   │   └── telegram.ts             ← Cliente Grammy compartido
│   ├── infra/
│   │   ├── env.ts                  ← Validación de env vars con zod
│   │   └── logger.ts               ← Pino configurado
│   ├── scheduler/
│   │   └── jobs.ts                 ← Registro central de cron jobs
│   └── index.ts                    ← Bootstrap del hub
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-11-linkedin-ideas-design.md  ← este archivo
├── tests/
│   └── linkedin-ideas/
│       ├── proxycurl.test.ts
│       ├── classifier.test.ts
│       └── deduper.test.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Modelo de datos

### Postgres — tabla `linkedin_posts`

```sql
CREATE TABLE linkedin_posts (
  id              SERIAL PRIMARY KEY,
  post_url        TEXT UNIQUE NOT NULL,
  author_handle   TEXT NOT NULL,
  author_name     TEXT,
  posted_at       TIMESTAMP,
  hook            TEXT,
  body            TEXT,
  format          TEXT, -- 'text' | 'carousel' | 'video' | 'poll' | 'image'
  likes           INT DEFAULT 0,
  comments        INT DEFAULT 0,
  reposts         INT DEFAULT 0,
  engagement_score INT GENERATED ALWAYS AS (likes + comments * 3 + reposts * 5) STORED,
  topic           TEXT, -- clasificado por IA
  language        TEXT, -- 'en' | 'es' | 'pt'
  scraped_at      TIMESTAMP DEFAULT NOW(),
  sheet_synced    BOOLEAN DEFAULT false,
  sheet_synced_at TIMESTAMP
);

CREATE INDEX idx_posts_scraped_at ON linkedin_posts(scraped_at DESC);
CREATE INDEX idx_posts_engagement ON linkedin_posts(engagement_score DESC);
CREATE INDEX idx_posts_author ON linkedin_posts(author_handle);
CREATE INDEX idx_posts_sheet_synced ON linkedin_posts(sheet_synced) WHERE sheet_synced = false;
```

### Google Sheet — estructura de columnas

| Col | Header | Tipo | Origen |
|---|---|---|---|
| A | Fecha scrape | Date | scraped_at |
| B | Autor | Text | author_name |
| C | Handle | Text | author_handle |
| D | Fecha post | Date | posted_at |
| E | URL | URL | post_url |
| F | Hook | Text | hook |
| G | Cuerpo | Text | body (truncado a 1000 chars) |
| H | Formato | Text | format |
| I | Likes | Number | likes |
| J | Comentarios | Number | comments |
| K | Reposts | Number | reposts |
| L | Engagement Score | Number | engagement_score |
| M | Tema | Text | topic |
| N | Idioma | Text | language |
| O | Estado | Dropdown | "Nueva" (default) — editable: Aprobada/Usada/Descartada |
| P | Notas | Text | vacío — editable por humano |

**Sheet ID:** se setea en `.env` como `GOOGLE_SHEET_ID`. Hoja única `Ideas`.

---

## 6. Seed List de creators

Hardcoded en `src/modules/linkedin-ideas/seed-list.ts` como array TS. Esto permite agregar/quitar con un commit en lugar de un panel admin.

```typescript
export const SEED_PROFILES = [
  { handle: 'wilmarocha',       name: 'Wilmar Rocha (own)',   minLikes: 50 },
  { handle: 'justinwelsh',      name: 'Justin Welsh',         minLikes: 500 },
  { handle: 'jasminalic',       name: 'Jasmin Alić',          minLikes: 500 },
  { handle: 'laraacosta',       name: 'Lara Acosta',          minLikes: 500 },
  { handle: 'matt-gray-vc',     name: 'Matt Gray',            minLikes: 500 },
  { handle: 'dickiebush',       name: 'Dickie Bush',          minLikes: 500 },
  { handle: 'nicolascole77',    name: 'Nicolas Cole',         minLikes: 500 },
  { handle: 'kierandrew',       name: 'Kieran Drew',          minLikes: 500 },
  { handle: 'chrisdonnelly1',   name: 'Chris Donnelly',       minLikes: 500 },
  { handle: 'gregisenberg',     name: 'Greg Isenberg',        minLikes: 500 },
  { handle: 'alexhormozi',      name: 'Alex Hormozi',         minLikes: 1000 },
  { handle: 'codiesanchez',     name: 'Codie Sanchez',        minLikes: 1000 },
  { handle: 'sahilbloom',       name: 'Sahil Bloom',          minLikes: 1000 },
  { handle: 'dvassallo',        name: 'Daniel Vassallo',      minLikes: 500 },
  { handle: 'tibo-maker',       name: 'Tibo Louis-Lucas',     minLikes: 300 },
  { handle: 'samparr',          name: 'Sam Parr',             minLikes: 1000 },
];
```

⚠️ Los `handle` exactos deben verificarse contra LinkedIn en tiempo de implementación; algunos pueden variar.

---

## 7. Variables de entorno

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/aifennec_hub

# Proxycurl
PROXYCURL_API_KEY=<32-char-hex>

# Anthropic (Claude Haiku 4.5)
ANTHROPIC_API_KEY=sk-ant-...

# Google Sheets
GOOGLE_SHEET_ID=<sheet-id-from-url>
GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded-json>   # o path al archivo

# Telegram
TELEGRAM_BOT_TOKEN=<token>
TELEGRAM_DIGEST_CHAT_ID=<chat-id de Wilmar>

# Scheduler
LINKEDIN_IDEAS_CRON=0 6 * * *           # 6:00 AM diario
LINKEDIN_IDEAS_TIMEZONE=America/Bogota

# General
NODE_ENV=production
LOG_LEVEL=info
```

`src/infra/env.ts` valida todas con zod en bootstrap. Si falta una, el proceso muere con error claro.

---

## 8. Flujo de datos detallado (1 corrida del cron)

1. **Bootstrap:** carga `.env`, valida con zod, conecta a Postgres.
2. **Trigger:** `node-cron` dispara a las 06:00 hora Bogotá.
3. **Loop por perfil** (rate limit: 1 perfil cada 3 segundos para ser cortés con Proxycurl):
   1. Llama `GET https://nubela.co/proxycurl/api/v2/linkedin/posts?linkedin_profile_url=...`
   2. Recibe array de posts (cada uno con `urn`, `text`, `total_reaction_count`, `comments_count`, `reshare_count`, `posted_on`, `media_type`)
   3. Para cada post: construye `post_url` canónico desde el URN
   4. Filtra por `minLikes` del perfil
4. **Dedup batch:** SQL `SELECT post_url FROM linkedin_posts WHERE post_url = ANY($1)` → set de existentes. Solo procesa los nuevos.
5. **Classify batch:** llama Claude Haiku una vez con todos los posts nuevos del día (en un solo prompt con structured output JSON), recibe `[{post_id, topic, hook, format, language}]`. Esto reduce costo y latencia vs llamada por post.
6. **Persist Postgres:** `INSERT ... ON CONFLICT DO NOTHING` (segundo seguro contra dedup race).
7. **Persist Sheets:** lee filas con `sheet_synced = false`, las appendea al Sheet en batch (max 100 filas/llamada), marca `sheet_synced = true`.
8. **Digest Telegram:** query top 10 por `engagement_score` de los posts insertados HOY, formatea mensaje markdown, envía a `TELEGRAM_DIGEST_CHAT_ID`.
9. **Cierre:** log estructurado con `{processed_profiles, new_posts, errors, duration_ms}`.

---

## 9. Formato del digest Telegram

```
🔥 *LinkedIn Viral Digest — 11 abr 2026*

12 ideas nuevas hoy. Top 10 por engagement:

1. *Justin Welsh* — 2,341 likes | 89 comments
   "I quit my $300k job to make $0..."
   📎 https://linkedin.com/posts/...

2. *Alex Hormozi* — 1,890 likes | 124 comments
   "Most agencies fail because..."
   📎 https://linkedin.com/posts/...

[... 8 más ...]

📊 Sheet completa: https://docs.google.com/spreadsheets/d/...
```

---

## 10. Manejo de errores

| Falla | Comportamiento | Notificación |
|---|---|---|
| Proxycurl 429 (rate limit) | Backoff exponencial 3 reintentos, salta perfil | Log warning |
| Proxycurl 401 (key inválida) | Aborta corrida completa | Telegram alerta a Wilmar |
| Proxycurl 404 (perfil no existe) | Salta perfil, continúa | Log warning, alerta acumulada |
| Claude API error | Reintenta 2 veces, si falla guarda con `topic = NULL` | Log error |
| Sheets API error | Reintenta 3 veces, si falla deja `sheet_synced = false` para próxima corrida | Telegram warning |
| Postgres connection error | Aborta corrida | Telegram alerta crítica |
| Telegram digest error | Log only (no rompe corrida) | — |

**Principio:** una corrida nunca explota silenciosamente. Si algo crítico falla, Wilmar lo sabe en Telegram en menos de 1 minuto.

---

## 11. Testing

**Unit tests (vitest):**
- `proxycurl.test.ts` — mock fetch, valida parsing de respuestas
- `classifier.test.ts` — mock Claude, valida extracción de campos
- `deduper.test.ts` — usa Postgres test container o pgmem
- `digest.test.ts` — valida formato del mensaje markdown

**Integration test manual (día 1):**
- Correr `npm run scrape:once` con 3 perfiles reales
- Verificar fila en Postgres
- Verificar fila en Sheet
- Verificar digest en Telegram

**No e2e automático en v1** — el test integración manual del día 1 es suficiente.

---

## 12. Deploy en VPS (Easypanel)

1. Build local: `npm run build` produce `dist/`
2. `Dockerfile` con multistage build (deps → build → runtime slim)
3. Push a repo git (GitHub o Gitea del VPS)
4. Easypanel: nueva app desde repo, env vars configuradas en el panel
5. Proceso único corre `node dist/index.js` que arranca el cron interno
6. Healthcheck: HTTP `GET /health` en puerto interno (mini express opcional v1.1)

**Recursos estimados:** 256 MB RAM, 0.25 vCPU. El módulo es livianísimo sin browsers.

---

## 13. Out of scope (v1)

Lista explícita de cosas que NO hacemos en v1, para no expandir scope:

- ❌ Dashboard web (Sheet es la UI)
- ❌ Auto-discovery de creators nuevos
- ❌ Generación automática de drafts de posts (solo ideas)
- ❌ Detección automática de lead magnet en bios
- ❌ Análisis temporal (mejores horarios para postear)
- ❌ Scraping de comentarios de los posts
- ❌ Extracción de imágenes/carruseles
- ❌ Multi-idioma para clasificación (asumimos inglés primario, español secundario)
- ❌ API HTTP del módulo
- ❌ Autenticación / multi-usuario
- ❌ Backup automático del Sheet (Google ya versiona)

Cada uno de estos puede ser una v1.1, v1.2, etc. cuando v1 corra estable 2 semanas.

---

## 14. Open questions / TODOs antes del plan

- [ ] **Verificar handles exactos** de cada creator en LinkedIn al implementar
- [ ] **Wilmar provee chat_id de Telegram** (`TELEGRAM_DIGEST_CHAT_ID`)
- [ ] **Crear bot Telegram dedicado** `@aifennec_hub_bot` o reusar uno existente
- [ ] **Crear DB `aifennec_hub`** en Postgres del VPS
- [ ] **Crear Google Sheet** + Service Account + compartir Sheet con email del SA
- [ ] **Confirmar timezone del cron** — Bogotá vs UTC
- [ ] **Confirmar threshold de engagement** — `minLikes` por defecto 500 o 300

---

## 15. Costos operativos estimados (mensuales)

| Servicio | Costo | Notas |
|---|---|---|
| Proxycurl | ~$15 | 16 perfiles × 30 días × ~1 crédito = ~480 lookups/mes × $0.03 |
| Anthropic Claude Haiku 4.5 | ~$2 | ~300 posts/mes × 1 llamada × ~$0.005 |
| Google Sheets API | $0 | Free tier suficiente |
| Telegram Bot API | $0 | Free |
| VPS (existente) | $0 incremental | Reusa el del hub |
| **Total mensual** | **~$17** | |

**ROI:** si genera 1 cliente extra de $1.800/mes en los próximos 6 meses, el sistema se paga 100x.

---

## 16. Roadmap post-v1 (no implementar todavía)

- **v1.1** — agregar `wilmarocha` deep analytics: mejores hooks propios, días/horarios óptimos
- **v1.2** — auto-discovery: scrape comentarios de posts virales, detecta nuevos creators con engagement alto y lead magnet
- **v1.3** — generador de drafts: dado un post viral + voz de Wilmar, Claude escribe 3 variantes para Wilmar editar
- **v1.4** — segundo módulo del hub: lead scraping (Google Maps) — el plan B2B que dejamos en pausa

---

*Spec aprobado por Wilmar Rocha el 2026-04-11. Próximo paso: writing-plans skill para generar plan de implementación detallado paso a paso.*
