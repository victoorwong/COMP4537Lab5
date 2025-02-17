require('dotenv').config();

const dbPassword = process.env.DB_PASSWORD;
const sslMode = process.env.SSL_MODE || 'DISABLED';  


const sslConfig = sslMode === 'REQUIRED' 
  ? { rejectUnauthorized: false } 
  : false;  

module.exports = {
  dbConfig: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: dbPassword,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: sslConfig,  
  },
};
