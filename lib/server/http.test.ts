import { describe, expect, it } from 'vitest';
import {
  allowRequest,
  clientIp,
  isHoneypot,
  resetRateLimitsForTests,
  validEmail,
} from '@/lib/server/http';

describe('validEmail', () => {
  it('accepts a simple address and rejects missing domains', () => {
    expect(validEmail('aina@example.com')).toBe(true);
    expect(validEmail('not-an-email')).toBe(false);
    expect(validEmail('')).toBe(false);
    expect(validEmail(null)).toBe(false);
  });
});

describe('isHoneypot', () => {
  it('treats any filled hidden field as a bot', () => {
    expect(isHoneypot('')).toBe(false);
    expect(isHoneypot('   ')).toBe(false);
    expect(isHoneypot(undefined)).toBe(false);
    expect(isHoneypot('https://spam.example')).toBe(true);
  });
});

describe('allowRequest', () => {
  it('counts waitlist and events separately for the same IP', () => {
    resetRateLimitsForTests();
    const ip = '203.0.113.80';
    expect(allowRequest(ip, 1, 60_000, 'waitlist')).toBe(true);
    expect(allowRequest(ip, 1, 60_000, 'waitlist')).toBe(false);
    expect(allowRequest(ip, 1, 60_000, 'events')).toBe(true);
  });

  it('reads the first forwarded address', () => {
    const request = new Request('http://localhost/api/waitlist/', {
      headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
    });
    expect(clientIp(request)).toBe('198.51.100.9');
  });
});
