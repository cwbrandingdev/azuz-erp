import {
  META_MAX_SCHEDULE_LEAD_MS,
  META_MIN_SCHEDULE_LEAD_MS,
  resolveMetaPublishAt,
} from './meta-schedule';

describe('resolveMetaPublishAt', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');

  it('returns null publishAt for past or immediate publication', () => {
    expect(
      resolveMetaPublishAt(new Date('2026-09-30T11:00:00.000Z'), now),
    ).toEqual({ publishAtUnix: null });
  });

  it('rejects schedules inside the minimum lead window', () => {
    const tooSoon = new Date(now.getTime() + META_MIN_SCHEDULE_LEAD_MS - 1000);
    const result = resolveMetaPublishAt(tooSoon, now);
    expect(result.publishAtUnix).toBeNull();
    expect(result.error).toMatch(/10 minutos/);
  });

  it('accepts schedules within the allowed window', () => {
    const valid = new Date(now.getTime() + META_MIN_SCHEDULE_LEAD_MS + 60_000);
    const result = resolveMetaPublishAt(valid, now);
    expect(result.error).toBeUndefined();
    expect(result.publishAtUnix).toBe(Math.floor(valid.getTime() / 1000));
  });

  it('rejects schedules beyond 75 days', () => {
    const tooFar = new Date(now.getTime() + META_MAX_SCHEDULE_LEAD_MS + 1000);
    const result = resolveMetaPublishAt(tooFar, now);
    expect(result.publishAtUnix).toBeNull();
    expect(result.error).toMatch(/75 dias/);
  });
});
