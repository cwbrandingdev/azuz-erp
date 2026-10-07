"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = require("path");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
}
const DEFAULT_CORS_ORIGINS = [
    'https://atria-erp.vercel.app',
    'https://azuz.cwbranding.com.br',
    'https://atria-erp.vercel.com',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
];
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads/' });
    app.use((0, cookie_parser_1.default)());
    const configuredOrigins = (configService.get('CORS_ORIGIN') ?? '')
        .split(',')
        .map((origin) => origin
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\/$/, ''))
        .filter(Boolean);
    const allowedOrigins = [
        ...new Set([...DEFAULT_CORS_ORIGINS, ...configuredOrigins]),
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
        ],
        exposedHeaders: ['Authorization'],
        credentials: true,
        optionsSuccessStatus: 204,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    const port = configService.get('PORT', 3001);
    await app.listen(port);
    const appUrl = await app.getUrl();
    console.log(`Application is running on: ${appUrl}`);
}
bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map