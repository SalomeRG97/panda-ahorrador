const { z, rejectNonNumericScalar, idParamSchema, viewAsQuerySchema } = require('./common.validator');

const yearNumberSchema = z.preprocess(
  rejectNonNumericScalar,
  z.coerce
    .number({ message: 'El año debe ser un número válido' })
    .int('El año debe ser un número entero')
    .min(2000, 'El año debe estar entre 2000 y 2100')
    .max(2100, 'El año debe estar entre 2000 y 2100')
);

const startMonthSchema = z.preprocess(
  rejectNonNumericScalar,
  z.coerce
    .number({ message: 'El mes de inicio debe ser un número válido' })
    .int('El mes de inicio debe ser un número entero')
    .min(1, 'El mes de inicio debe estar entre 1 y 12')
    .max(12, 'El mes de inicio debe estar entre 1 y 12')
);

const createYearSchema = z
  .preprocess((val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return {
        ...val,
        startMonth: val.startMonth !== undefined ? val.startMonth : val.start_month,
      };
    }
    return val;
  }, z.object({
    year: yearNumberSchema,
    startMonth: startMonthSchema,
  }));

module.exports = {
  yearNumberSchema,
  startMonthSchema,
  createYearSchema,
  idParamSchema,
  viewAsQuerySchema,
};

