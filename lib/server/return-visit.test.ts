import { describe, expect, it } from 'vitest';
import { programFixture } from '@/lib/test-fixtures';
import {
  composeReturnEmail,
  programmesNeedingReminder,
  reminderIsDue,
} from '@/lib/server/return-visit';
import { hashReturnToken, newReturnToken } from '@/lib/server/mail';

describe('return tokens', () => {
  it('hashes a token so the raw value is not what we store', () => {
    const token = newReturnToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hashReturnToken(token)).toHaveLength(64);
    expect(hashReturnToken(token)).not.toBe(token);
    expect(hashReturnToken(token)).toBe(hashReturnToken(token));
  });
});

describe('programmesNeedingReminder', () => {
  it('skips rolling programmes even when they are open', () => {
    const rolling = programFixture({
      applicationCycle: 'rolling',
      opensMonth: 1,
      closesMonth: 12,
    });
    expect(programmesNeedingReminder([rolling], new Date(2026, 6, 1))).toEqual([]);
  });

  it('includes a seasonal window that is opening soon or in its last month', () => {
    const seasonal = programFixture({
      applicationCycle: 'seasonal',
      opensMonth: 7,
      closesMonth: 9,
    });
    expect(programmesNeedingReminder([seasonal], new Date(2026, 4, 1)).map((row) => row.id)).toEqual([
      seasonal.id,
    ]);
    expect(programmesNeedingReminder([seasonal], new Date(2026, 8, 1)).map((row) => row.id)).toEqual([
      seasonal.id,
    ]);
    expect(programmesNeedingReminder([seasonal], new Date(2026, 6, 1))).toEqual([]);
  });
});

describe('reminderIsDue', () => {
  it('waits at least six days between reminders', () => {
    const now = new Date('2026-09-15T00:00:00.000Z');
    expect(reminderIsDue(null, now)).toBe(true);
    expect(reminderIsDue('2026-09-14T00:00:00.000Z', now)).toBe(false);
    expect(reminderIsDue('2026-09-01T00:00:00.000Z', now)).toBe(true);
  });
});

describe('composeReturnEmail', () => {
  it('includes the restore link and the shortlist, but not a CGPA', () => {
    const token = 'a'.repeat(64);
    const mail = composeReturnEmail({
      origin: 'https://example.com',
      token,
      lines: [
        {
          id: 'petronas-graduate-programme',
          employer: 'PETRONAS',
          name: 'Graduate Employability Enhancement Scheme',
          window: 'Year-round',
          sourceUrl: 'https://www.petronas.com/',
        },
      ],
    });
    expect(mail.text).toContain(`https://example.com/return/${token}/`);
    expect(mail.text).toContain('/delete/');
    expect(mail.text).toContain('PETRONAS');
    expect(mail.text).not.toMatch(/\b3\.\d{2}\b/i);
  });
});
