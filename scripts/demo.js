const path=require('node:path');
process.env.ALTHEA_STORAGE='json';
process.env.ALTHEA_DB_FILE=process.env.ALTHEA_DB_FILE || path.join(__dirname,'../data/practica.json');
require('../server');
