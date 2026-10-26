const db=require('../src/models/db');
db.request(()=>{
  const d=db.load();
  console.log('Conexión correcta:',require('../src/config').STORAGE);
  console.log(Object.fromEntries(['clientes','solicitudes','reservas','cotizaciones','pagos','destinos'].map(t=>[t,(d[t] || []).length])));
}).catch(err=>{console.error(err.message);process.exitCode=1;});
