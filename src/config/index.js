const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  HOST: 'localhost',
  PUBLIC_DIR: path.join(__dirname, '..', '..', 'public'),
  DB_FILE: path.join(__dirname, '..', '..', 'data', 'db.json'),
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
