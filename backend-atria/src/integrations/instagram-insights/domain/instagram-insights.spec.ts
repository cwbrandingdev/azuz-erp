import { KanbanTaskContentType } from '@prisma/client';
import { mapInstagramMediaToContentType } from './instagram-media-type';
import { isMetaTokenExpired } from './meta-token-expired.error';
import { readFollowBreakdown, sumMetricValues } from './instagram-insights.metrics';
import {
  isTimestampInPeriod,
  intersectWithLookback,
  resolveInsightsPeriod,
} from './instagram-insights.period';

describe('instagram media type mapping', () => {
  it('maps reels and videos to VIDEO_WITH_SCRIPT', () => {
    expect(mapInstagramMediaToContentType('VIDEO', 'REELS')).toBe(
      KanbanTaskContentType.VIDEO_WITH_SCRIPT,
    );
  });

  it('maps carousel albums to CAROUSEL', () => {
    expect(mapInstagramMediaToContentType('CAROUSEL_ALBUM', 'FEED')).toBe(
      KanbanTaskContentType.CAROUSEL,
    );
  });

  it('maps stories to STORIES_NO_SCRIPT', () => {
    expect(mapInstagramMediaToContentType('IMAGE', 'STORY')).toBe(
      KanbanTaskContentType.STORIES_NO_SCRIPT,
    );
  });

  it('maps static images to STATIC', () => {
    expect(mapInstagramMediaToContentType('IMAGE', 'FEED')).toBe(
      KanbanTaskContentType.STATIC,
    );
  });
});

describe('meta token expiry detection', () => {
  it('detects Graph error code 190', () => {
    expect(isMetaTokenExpired({ code: 190, type: 'OAuthException' })).toBe(
      true,
    );
  });

  it('detects expired session messages', () => {
    expect(
      isMetaTokenExpired({
        message: 'Error validating access token: Session has expired',
      }),
    ).toBe(true);
  });
});

describe('insight metric helpers', () => {
  it('sums daily metric values', () => {
    expect(
      sumMetricValues(
        {
          data: [
            {
              name: 'reach',
              values: [{ value: 10 }, { value: 5 }],
            },
          ],
        },
        'reach',
      ),
    ).toBe(15);
  });

  it('reads follow and unfollow breakdowns', () => {
    expect(
      readFollowBreakdown({
        data: [
          {
            name: 'follows_and_unfollows',
            total_value: {
              breakdowns: [
                {
                  results: [
                    { dimension_values: ['FOLLOW'], value: 8 },
                    { dimension_values: ['UNFOLLOW'], value: 2 },
                  ],
                },
              ],
            },
          },
        ],
      }),
    ).toEqual({ follows: 8, unfollows: 2 });
  });

  it('treats follower and non-follower totals as new follows', () => {
    expect(
      readFollowBreakdown({
        data: [
          {
            name: 'follows_and_unfollows',
            total_value: {
              breakdowns: [
                {
                  results: [
                    { dimension_values: ['FOLLOWER'], value: 23 },
                    { dimension_values: ['NON_FOLLOWER'], value: 11 },
                  ],
                },
              ],
            },
          },
        ],
      }),
    ).toEqual({ follows: 34, unfollows: 0 });
  });
});

describe('insights period', () => {
  it('resolves september 2026 to sao paulo bounds', () => {
    const period = resolveInsightsPeriod(
      9,
      2026,
      new Date('2026-09-10T12:00:00.000Z'),
    );
    expect(period.label).toBe('Setembro 2026');
    expect(period.month).toBe(9);
    expect(period.year).toBe(2026);
    expect(period.since).toBe(Date.UTC(2026, 8, 1, 3, 0, 0) / 1000);
    expect(period.until).toBe(Math.floor(Date.parse('2026-09-10T12:00:00.000Z') / 1000));
  });

  it('clamps future months to the current month', () => {
    const period = resolveInsightsPeriod(
      12,
      2026,
      new Date('2026-09-10T12:00:00.000Z'),
    );
    expect(period.month).toBe(9);
    expect(period.year).toBe(2026);
  });

  it('filters timestamps inside the selected month', () => {
    const since = Date.UTC(2026, 8, 1, 3, 0, 0) / 1000;
    const until = Date.UTC(2026, 9, 1, 3, 0, 0) / 1000;
    expect(
      isTimestampInPeriod('2026-09-15T12:00:00+0000', since, until),
    ).toBe(true);
    expect(
      isTimestampInPeriod('2026-08-31T12:00:00+0000', since, until),
    ).toBe(false);
  });

  it('intersects a past month with the 30-day lookback', () => {
    const period = resolveInsightsPeriod(
      8,
      2026,
      new Date('2026-09-10T12:00:00.000Z'),
    );
    const window = intersectWithLookback(
      period,
      new Date('2026-09-10T12:00:00.000Z'),
    );
    expect(window.available).toBe(true);
    expect(window.partial).toBe(true);
    expect(window.until).toBe(period.until);
  });

  it('marks months older than 30 days as unavailable', () => {
    const period = resolveInsightsPeriod(
      7,
      2026,
      new Date('2026-09-10T12:00:00.000Z'),
    );
    const window = intersectWithLookback(
      period,
      new Date('2026-09-10T12:00:00.000Z'),
    );
    expect(window.available).toBe(false);
    expect(window.partial).toBe(false);
  });
});
