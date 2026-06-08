export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
}
