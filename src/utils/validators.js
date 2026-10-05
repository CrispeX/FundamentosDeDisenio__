const { HttpError } = require('./errors');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requerido(valor, campo) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new HttpError(400, `El campo ${campo} es obligatorio`);
  }
  return String(valor).trim();
}

function correo(valor) {
  const v = requerido(valor, 'correo electrónico');
  if (!EMAIL.test(v)) throw new HttpError(400, 'El correo electrónico no es válido');
  return v;
}

function fecha(valor, campo) {
  const v = requerido(valor, campo);
  if (Number.isNaN(Date.parse(v))) throw new HttpError(400, `La fecha de ${campo} no es válida`);
  return v;
}

function rangoFechas(salida, regreso) {
  if (Date.parse(regreso) < Date.parse(salida)) {
    throw new HttpError(400, 'La fecha de regreso no puede ser anterior a la de salida');
  }
}

module.exports = { requerido, correo, fecha, rangoFechas };
