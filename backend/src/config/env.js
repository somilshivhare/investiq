import dotenv from 'dotenv';

// Force dotenv to override any pre-existing environment variables from the active shell session
dotenv.config({ override: true });

console.log('[env] Environment variables loaded with override flag.');
