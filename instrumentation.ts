/**
 * Optional error reporting for Route Handlers. With no SENTRY_DSN the app
 * behaves as it does today: errors still return JSON, they just are not shipped
 * to Sentry.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export async function onRequestError(
  error: { digest: string } & Error,
  request: { path: string; method: string },
  context: Record<string, unknown>,
) {
  if (!process.env.SENTRY_DSN?.trim()) return;
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error, {
      extra: { path: request.path, method: request.method, ...context },
    });
  } catch {
    console.error(error);
  }
}
