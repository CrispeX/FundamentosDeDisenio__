require('./env');
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || 'localhost',
  PUBLIC_DIR: path.join(__dirname, '..', '..', 'public'),
  DB_FILE: process.env.ALTHEA_DB_FILE || path.join(__dirname, '..', '..', 'data', 'db.json'),
  STORAGE: process.env.ALTHEA_STORAGE || 'supabase',
  SUPABASE_PROJECT_REF: 'ciwkgqdpogteheeyigxb',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://ciwkgqdpogteheeyigxb.supabase.co',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  MIME: {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
  }
};
