import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017',
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-0123456789',
      APP_ORIGINS: 'http://localhost:3000',
    },
  },
});
