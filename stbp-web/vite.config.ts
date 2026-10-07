import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento, /api é encaminhado para a API Spring Boot local (em produção, o nginx faz isso).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // STBP_API_URL permite apontar para outra API (ex.: testes numa porta separada)
      '/api': process.env.STBP_API_URL ?? 'http://localhost:8080',
    },
  },
})
