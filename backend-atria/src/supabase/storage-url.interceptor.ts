import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseStorageService } from './supabase-storage.service';

const LEGACY_STORAGE_MARKER = '/storage/v1/object/';

@Injectable()
export class StorageUrlInterceptor implements NestInterceptor {
  constructor(private readonly storage: SupabaseStorageService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (!this.storage.rewritesLegacyUrls) return next.handle();

    return next.handle().pipe(
      map((data) =>
        rewriteLegacyUrls(data, (url) => this.storage.rewritePublicUrl(url)),
      ),
    );
  }
}

export function rewriteLegacyUrls(
  value: unknown,
  rewrite: (url: string) => string,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    return value.includes(LEGACY_STORAGE_MARKER) ? rewrite(value) : value;
  }

  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (typeof (value as { pipe?: unknown }).pipe === 'function') return value;
  if (seen.has(value)) return value;

  seen.add(value);

  const prototype = Object.getPrototypeOf(value);
  const toJson = (value as { toJSON?: () => unknown }).toJSON;
  if (
    typeof toJson === 'function' &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return rewriteLegacyUrls(toJson.call(value), rewrite, seen);
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteLegacyUrls(item, rewrite, seen));
  }

  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    output[key] = rewriteLegacyUrls(
      (value as Record<string, unknown>)[key],
      rewrite,
      seen,
    );
  }
  return output;
}
