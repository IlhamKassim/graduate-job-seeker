import { describe, expect, it } from 'vitest';
import { composeDeletionEmail } from '@/lib/server/deletion';

describe('composeDeletionEmail', () => {
  it('includes the confirmation link and does not mention a CGPA', () => {
    const token = 'b'.repeat(64);
    const mail = composeDeletionEmail({ origin: 'https://example.com', token });
    expect(mail.text).toContain(`https://example.com/delete/${token}/`);
    expect(mail.text).not.toMatch(/\b3\.\d{2}\b/i);
    expect(mail.text).not.toMatch(/cgpa/i);
  });
});
