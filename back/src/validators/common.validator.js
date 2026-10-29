const { z } = require('zod');

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Evita que null, strings vacíos, booleanos o arreglos se conviertan silenciosamente a 0 o 1
 * cuando se usa z.coerce.number().
 */
function rejectNonNumericScalar(val) {
  if (val === null || val === undefined || typeof val === 'boolean' || typeof val === 'object') {
    return NaN;
  }
  if (typeof val === 'string' && val.trim() === '') {
    return NaN;
  }
  return val;
}

/**
 * Verifica que un string YYYY-MM-DD corresponda a una fecha calendario real (incluyendo años bisiestos).
 */
function isValidCalendarDate(val) {
  if (typeof val !== 'string' || !ISO_DATE_REGEX.test(val)) {
    return false;
  }
  const [yStr, mStr, dStr] = val.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

// Primitivas comunes solicitadas
const id = z.preprocess(
  rejectNonNumericScalar,
  z.coerce
    .number({ message: 'El ID debe ser un número válido' })
    .int('El ID debe ser un número entero')
    .positive('El ID debe ser un entero positivo')
);

const date = z
  .string({ message: 'La fecha es requerida' })
  .trim()
  .regex(ISO_DATE_REGEX, 'La fecha debe tener el formato YYYY-MM-DD')
  .refine(isValidCalendarDate, 'La fecha no es una fecha calendario válida');

const money = z.preprocess(
  rejectNonNumericScalar,
  z.coerce
    .number({ message: 'El monto debe ser un número válido' })
    .min(0, 'El monto no puede ser negativo')
    .max(999_999_999_999, 'El monto excede el límite permitido')
    .multipleOf(0.01, 'El monto puede tener máximo 2 decimales')
);

const concept = z
  .string({ message: 'El concepto es requerido' })
  .trim()
  .min(1, 'El concepto no puede estar vacío')
  .max(255, 'El concepto no puede exceder 255 caracteres');

// Esquemas reutilizables para params y query
const idParamSchema = z.object({ id });
const monthIdParamSchema = z.object({ monthId: id });
const yearIdParamSchema = z.object({ yearId: id });
const viewAsQuerySchema = z.object({
  viewAs: id.optional(),
});

module.exports = {
  z,
  rejectNonNumericScalar,
  isValidCalendarDate,
  id,
  date,
  money,
  concept,
  idParamSchema,
  monthIdParamSchema,
  yearIdParamSchema,
  viewAsQuerySchema,
};

