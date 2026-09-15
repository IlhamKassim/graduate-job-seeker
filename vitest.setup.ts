/**
 * Unit tests must not write to the operator Neon database or the shared
 * `.data/capture.json` file a local server may be using.
 */
delete process.env.DATABASE_URL;
