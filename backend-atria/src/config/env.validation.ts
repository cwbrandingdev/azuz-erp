import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    SUPABASE_URL: z.string().url().optional().or(z.literal('')),
    SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
    SUPABASE_DB_SCHEMA: z.enum(['dev', 'public']).default('public'),
    SUPABASE_STORAGE_BUCKET: z.string().optional(),
    SUPABASE_DELIVERABLES_BUCKET: z.string().optional(),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),
    CORS_ORIGIN: z.string().optional(),
    COMPANY_EMAIL_DOMAIN: z.string().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    TENANT_SECRETS_KEY: z.string().optional(),
    TENANT_BASE_DOMAINS: z.string().optional().or(z.literal('')),
    APP_URL: z.string().optional().or(z.literal('')),
    FRONTEND_URL: z.string().optional().or(z.literal('')),
    ADMIN_EMAIL: z.string().optional().or(z.literal('')),
    AGENCY_ADMIN_EMAIL: z.string().optional().or(z.literal('')),
    MAIL_FROM: z.string().optional().or(z.literal('')),
    MAIL_PROVIDER: z.string().optional().or(z.literal('')),
    RESEND_API_KEY: z.string().optional().or(z.literal('')),
    SMTP_HOST: z.string().optional().or(z.literal('')),
    SMTP_PORT: z.string().optional().or(z.literal('')),
    SMTP_USER: z.string().optional().or(z.literal('')),
    SMTP_PASS: z.string().optional().or(z.literal('')),
    SMTP_SECURE: z.string().optional().or(z.literal('')),
    EMAILJS_SERVICE_ID: z.string().optional().or(z.literal('')),
    EMAILJS_TEMPLATE_ID: z.string().optional().or(z.literal('')),
    EMAILJS_PUBLIC_KEY: z.string().optional().or(z.literal('')),
    EMAILJS_USER_ID: z.string().optional().or(z.literal('')),
    EMAILJS_PRIVATE_KEY: z.string().optional().or(z.literal('')),
  })
  .transform((data) => {
    const schemaFromUrl = extractSchema(data.DATABASE_URL);
    const schema =
      schemaFromUrl === 'dev' || schemaFromUrl === 'public'
        ? schemaFromUrl
        : data.SUPABASE_DB_SCHEMA;

    return {
      ...data,
      DIRECT_URL: data.DIRECT_URL || data.DATABASE_URL,
      SUPABASE_URL: data.SUPABASE_URL || undefined,
      SUPABASE_ANON_KEY: data.SUPABASE_ANON_KEY || undefined,
      SUPABASE_SERVICE_ROLE_KEY: data.SUPABASE_SERVICE_ROLE_KEY || undefined,
      SUPABASE_DB_SCHEMA: schema,
    };
  });

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  if (
    (!config.DIRECT_URL || config.DIRECT_URL === '') &&
    typeof config.DATABASE_URL === 'string' &&
    config.DATABASE_URL.length > 0
  ) {
    config.DIRECT_URL = config.DATABASE_URL;
    process.env.DIRECT_URL = config.DATABASE_URL;
  }

  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

function extractSchema(databaseUrl: string): string | null {
  try {
    const url = new URL(databaseUrl);
    return url.searchParams.get('schema');
  } catch {
    return null;
  }
}
