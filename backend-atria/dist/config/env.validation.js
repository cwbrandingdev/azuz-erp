"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3001),
    DATABASE_URL: zod_1.z.string().min(1),
    DIRECT_URL: zod_1.z.string().min(1).optional(),
    SUPABASE_URL: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    SUPABASE_ANON_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SUPABASE_DB_SCHEMA: zod_1.z.enum(['dev', 'public']).default('public'),
    SUPABASE_STORAGE_BUCKET: zod_1.z.string().optional(),
    SUPABASE_DELIVERABLES_BUCKET: zod_1.z.string().optional(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(1),
    JWT_REFRESH_SECRET: zod_1.z.string().min(1),
    JWT_ACCESS_EXPIRATION: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().optional(),
    COMPANY_EMAIL_DOMAIN: zod_1.z.string().optional(),
    COOKIE_DOMAIN: zod_1.z.string().optional(),
    TENANT_SECRETS_KEY: zod_1.z.string().optional(),
    TENANT_BASE_DOMAINS: zod_1.z.string().optional().or(zod_1.z.literal('')),
    APP_URL: zod_1.z.string().optional().or(zod_1.z.literal('')),
    FRONTEND_URL: zod_1.z.string().optional().or(zod_1.z.literal('')),
    ADMIN_EMAIL: zod_1.z.string().optional().or(zod_1.z.literal('')),
    AGENCY_ADMIN_EMAIL: zod_1.z.string().optional().or(zod_1.z.literal('')),
    MAIL_FROM: zod_1.z.string().optional().or(zod_1.z.literal('')),
    MAIL_PROVIDER: zod_1.z.string().optional().or(zod_1.z.literal('')),
    RESEND_API_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SMTP_HOST: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SMTP_PORT: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SMTP_USER: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SMTP_PASS: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SMTP_SECURE: zod_1.z.string().optional().or(zod_1.z.literal('')),
    EMAILJS_SERVICE_ID: zod_1.z.string().optional().or(zod_1.z.literal('')),
    EMAILJS_TEMPLATE_ID: zod_1.z.string().optional().or(zod_1.z.literal('')),
    EMAILJS_PUBLIC_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
    EMAILJS_USER_ID: zod_1.z.string().optional().or(zod_1.z.literal('')),
    EMAILJS_PRIVATE_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
})
    .transform((data) => {
    const schemaFromUrl = extractSchema(data.DATABASE_URL);
    const schema = schemaFromUrl === 'dev' || schemaFromUrl === 'public'
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
function validateEnv(config) {
    if ((!config.DIRECT_URL || config.DIRECT_URL === '') &&
        typeof config.DATABASE_URL === 'string' &&
        config.DATABASE_URL.length > 0) {
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
function extractSchema(databaseUrl) {
    try {
        const url = new URL(databaseUrl);
        return url.searchParams.get('schema');
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=env.validation.js.map