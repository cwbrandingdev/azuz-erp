import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    category?: 'MEMBER' | 'CLIENT';
    clientId?: string | null;
    companyId?: string | null;
    tenantId?: string | null;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(request: {
        tenantId?: string;
    }, payload: JwtPayload): Promise<AuthenticatedUser>;
}
export {};
