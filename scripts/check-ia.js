require('../src/config');
const {crearRecomendador}=require('../src/services/recomendaciones.service');

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('IA real pendiente: configura OPENAI_API_KEY en el entorno del servidor o en .env y ejecuta npm run ia:check.');
    process.exitCode=1;
    return;
  }
  const salida=new Date();salida.setUTCDate(salida.getUTCDate()+60);
  const regreso=new Date(salida);regreso.setUTCDate(regreso.getUTCDate()+4);
  const recomendar=crearRecomendador({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL || 'gpt-4.1-mini'});
  const resultado=await recomendar({destino:{origen:'Medellín',destino:'',fechaSalida:salida.toISOString().slice(0,10),fechaRegreso:regreso.toISOString().slice(0,10)},
    viajeros:[{tipo:'Adulto'},{tipo:'Niño'}],preferencias:{tipoServicio:'Paquete',presupuesto:5000000,intereses:['Playa'],notas:''}});
  if(resultado.modo!=='ia') {
    console.error('La consulta utilizó el catálogo de respaldo. No se acredita una ejecución de IA real. Revisa la configuración y disponibilidad del proveedor.');
    process.exitCode=1;
    return;
  }
  console.log(JSON.stringify({resultado:'IA real verificada',modo:resultado.modo,opciones:resultado.recomendaciones.map(r=>({id:r.id,destino:r.destino,motivo:r.motivo}))},null,2));
}
main().catch(()=>{console.error('No se pudo verificar la IA real. Revisa la configuración del servidor.');process.exitCode=1;});
