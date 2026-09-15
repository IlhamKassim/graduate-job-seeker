export async function reportError(error: unknown): Promise<void> {
  console.error(error);
  if (!process.env.SENTRY_DSN?.trim()) return;
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error);
  } catch {
    // The SDK is a no-op until SENTRY_DSN is set on the host.
  }
}
