import { CONSENT_VERSION } from '@/lib/config';

const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hits = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export function allowRequest(ip: string, limit = 12, windowMs = 60 * 60 * 1000, bucket = 'default'): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function validEmail(value: unknown): value is string {
  return typeof value === 'string' && looksLikeEmail.test(value.trim());
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isHoneypot(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export { CONSENT_VERSION };
