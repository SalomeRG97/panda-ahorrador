const { z, id, date, money, concept, idParamSchema, monthIdParamSchema, viewAsQuerySchema } = require('./common.validator');
const { setSavingSchema } = require('./saving.validator');

const createIncomeSchema = z
  .preprocess((val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const mId = val.month_id !== undefined ? val.month_id : val.monthId;
      return {
        ...val,
        month_id: mId,
      };
    }
    return val;
  }, z.object({
    month_id: id,
    date,
    concept,
    amount: money,
  }))
  .transform((data) => ({
    ...data,
    monthId: data.month_id,
  }));

const updateIncomeSchema = z
  .preprocess((val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const mId = val.month_id !== undefined ? val.month_id : val.monthId;
      return {
        ...val,
        ...(mId !== undefined ? { month_id: mId } : {}),
      };
    }
    return val;
  }, z.object({
    month_id: id.optional(),
    date,
    concept,
    amount: money,
  }))
  .transform((data) => ({
    ...data,
    ...(data.month_id !== undefined ? { monthId: data.month_id } : {}),
  }));

module.exports = {
  createIncomeSchema,
  updateIncomeSchema,
  setSavingSchema,
  idParamSchema,
  monthIdParamSchema,
  viewAsQuerySchema,
};

