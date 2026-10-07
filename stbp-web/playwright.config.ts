import { defineConfig } from '@playwright/test'

// Testes de ponta a ponta contra a aplicação rodando (API + `npm run dev`). Ver README.md.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:5173',
    locale: 'pt-BR',
    viewport: { width: 1366, height: 860 },
  },
  reporter: 'list',
})
