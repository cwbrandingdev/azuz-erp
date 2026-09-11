import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthorizationPolicyGuard } from './guards/authorization-policy.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { ClientAccessInterceptor } from './interceptors/client-access.interceptor';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
    AuthorizationPolicyGuard,
    ClientAccessInterceptor,
    {
      provide: APP_GUARD,
      useClass: AuthorizationPolicyGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClientAccessInterceptor,
    },
  ],
  exports: [AuthService, JwtModule, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
