import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StorageUrlInterceptor } from './storage-url.interceptor';
import { SupabaseService } from './supabase.service';
import { SupabaseStorageService } from './supabase-storage.service';

export const SUPABASE_ADMIN = Symbol('SUPABASE_ADMIN');

@Global()
@Module({
  providers: [
    SupabaseService,
    SupabaseStorageService,
    {
      provide: SUPABASE_ADMIN,
      useFactory: (supabase: SupabaseService) =>
        supabase.isConfigured ? supabase.admin : null,
      inject: [SupabaseService],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: StorageUrlInterceptor,
    },
  ],
  exports: [SupabaseService, SupabaseStorageService, SUPABASE_ADMIN],
})
export class SupabaseModule {}
