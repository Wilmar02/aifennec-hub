import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PROXYCURL_API_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  GOOGLE_SHEET_ID: z.string().min(10),
  GOOGLE_SERVICE_ACCOUNT_JSON_PATH: z.string().default('./google-service-account.json'),
  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/),
  TELEGRAM_DIGEST_CHAT_ID: z.string(),
  LINKEDIN_IDEAS_CRON: z.string().default('0 6 * * *'),
  LINKEDIN_IDEAS_TIMEZONE: z.string().default('America/Bogota'),
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
