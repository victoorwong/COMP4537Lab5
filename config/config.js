require('dotenv').config();

const dbPassword = process.env.DB_PASSWORD;
const sslMode = process.env.SSL_MODE || 'DISABLED';  // Default to 'DISABLED' if not set

// Configure SSL based on the SSL_MODE value from .env
const sslConfig = sslMode === 'REQUIRED' 
  ? { rejectUnauthorized: false } 
  : false;  // Disable SSL if SSL_MODE is not 'REQUIRED'

module.exports = {
  dbConfig: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: dbPassword,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: sslConfig,  // Apply the SSL configuration
  },
};
