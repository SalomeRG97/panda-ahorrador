const {
  z,
  id,
  rejectNonNumericScalar,
  monthIdParamSchema,
  viewAsQuerySchema,
} = require('./common.validator');

const daySchema = z.preprocess(
  rejectNonNumericScalar,
  z.coerce
    .number({ message: 'El día debe ser un número válido' })
    .int('El día debe ser un número entero')
    .min(1, 'El día debe estar entre 1 y 31')
    .max(31, 'El día debe estar entre 1 y 31')
);

const updateChallengeProgressSchema = z
  .preprocess((val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const mcId =
        val.monthChallengeId !== undefined ? val.monthChallengeId : val.month_challenge_id;
      return {
        ...val,
        monthChallengeId: mcId,
      };
    }
    return val;
  }, z.object({
    monthChallengeId: id,
    day: daySchema,
    completed: z.boolean({ message: 'El estado completado debe ser booleano' }),
  }))
  .transform((data) => ({
    ...data,
    month_challenge_id: data.monthChallengeId,
  }));

module.exports = {
  daySchema,
  updateChallengeProgressSchema,
  monthIdParamSchema,
  viewAsQuerySchema,
};

