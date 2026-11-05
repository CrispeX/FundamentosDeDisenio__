const { randomBytes, createHmac, timingSafeEqual } = require('node:crypto');
const { HttpError } = require('../utils/errors');
const secreto = randomBytes(32);
function firma(texto) { return createHmac('sha256', secreto).update(texto).digest('base64url'); }
function emitir(resumen) {
  const contenido = Buffer.from(JSON.stringify({ resumen, expira:Date.now()+600000 })).toString('base64url');
  return contenido + '.' + firma(contenido);
}
function verificar(token, resumen) {
  try {
    if(typeof token!=='string' || token.length>50000) throw Error();
    const partes=token.split('.');
    if(partes.length!==2)throw Error();
    const [contenido,mac]=partes, esperado=firma(contenido);
    if(mac.length!==esperado.length || !timingSafeEqual(Buffer.from(mac),Buffer.from(esperado)))throw Error();
    const datos=JSON.parse(Buffer.from(contenido,'base64url').toString('utf8'));
    if(datos.expira<Date.now() || JSON.stringify(datos.resumen)!==JSON.stringify(resumen))throw Error();
  } catch { throw new HttpError(409, 'Revisa nuevamente la vista previa antes de confirmar: los datos cambiaron o la vista venció'); }
}
module.exports={emitir,verificar};
