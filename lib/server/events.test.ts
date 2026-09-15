import { describe, expect, it } from 'vitest';
import { isAllowedEventType, sanitiseEventPayload } from '@/lib/server/events';

describe('sanitiseEventPayload', () => {
  it('keeps profile shape without CGPA or an email', () => {
    const cleaned = sanitiseEventPayload('profile_submitted', {
      degreeField: 'Computer Science',
      graduationYear: 2027,
      citizenship: 'MY',
      needsVisaSponsorship: false,
      preferredCities: ['Kuala Lumpur', 'Penang'],
      sectorsOfInterest: ['tech'],
      cgpa: 3.85,
      email: 'student@example.com',
    });
    expect(cleaned).toEqual({
      degreeField: 'Computer Science',
      graduationYear: 2027,
      citizenship: 'MY',
      needsVisaSponsorship: false,
      cityCount: 2,
      sectorCount: 1,
    });
    expect(JSON.stringify(cleaned)).not.toMatch(/3\.85|student@example\.com|cgpa|email/i);
  });

  it('reduces a waitlist join to a boolean', () => {
    expect(
      sanitiseEventPayload('waitlist_joined', { email: 'student@example.com', joined: true }),
    ).toEqual({ joined: true });
  });

  it('reduces a return visit to a boolean', () => {
    expect(sanitiseEventPayload('return_visit', { restored: true, email: 'student@example.com' })).toEqual({
      restored: true,
    });
  });

  it('reduces a waitlist deletion to a boolean', () => {
    expect(
      sanitiseEventPayload('waitlist_deleted', { deleted: true, email: 'student@example.com' }),
    ).toEqual({ deleted: true });
  });

  it('strips email and CGPA from every other allowed type', () => {
    const cleaned = sanitiseEventPayload('program_detail_opened', {
      programId: 'cimb-group-the-complete-banker',
      email: 'student@example.com',
      cgpa: 3.2,
    });
    expect(cleaned).toEqual({ programId: 'cimb-group-the-complete-banker' });
  });

  it('rejects event names the product does not emit', () => {
    expect(isAllowedEventType('profile_submitted')).toBe(true);
    expect(isAllowedEventType('waitlist_deleted')).toBe(true);
    expect(isAllowedEventType('password_reset')).toBe(false);
  });
});
