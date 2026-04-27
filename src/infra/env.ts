import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  APIFY_TOKEN: z.string().min(20),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  GOOGLE_SHEET_ID: z.string().min(10),
  GOOGLE_SERVICE_ACCOUNT_JSON_PATH: z.string().default('./google-service-account.json'),
  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/),
  TELEGRAM_DIGEST_CHAT_ID: z.string(),
  LINKEDIN_IDEAS_CRON: z.string().default('0 6 * * *'),
  LINKEDIN_IDEAS_TIMEZONE: z.string().default('America/Bogota'),
  GHL_TOKEN: z.string().startsWith('pit-').optional(),
  GHL_LOCATION_ID: z.string().default('fnnoAvoToASrDGCMxUK7'),
  GHL_PIPELINE_ID: z.string().default('6juPkObmavEVsUy4Unl2'),
  WA_PHONE_NUMBER_ID: z.string().default('747994915054038'),
  WA_WABA_ID: z.string().default('4056973161237053'),
  WA_ACCESS_TOKEN: z.string().optional(),
  WA_GRAPH_VERSION: z.string().default('v20.0'),
  COBRANZA_CRON: z.string().default('0 8 * * *'),
  COBRANZA_TIMEZONE: z.string().default('America/Bogota'),
  COBRANZA_DRY_RUN: z.coerce.boolean().default(true),
  COBRANZA_SEND_WHATSAPP: z.coerce.boolean().default(false),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  ALLOWED_TELEGRAM_IDS: z.string().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = (() => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
})();
