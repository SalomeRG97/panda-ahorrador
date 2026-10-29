const { z, id, money, viewAsQuerySchema } = require('./common.validator');

const setSavingSchema = z
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
    amount: money,
  }))
  .transform((data) => ({
    ...data,
    monthId: data.month_id,
  }));

module.exports = {
  setSavingSchema,
  viewAsQuerySchema,
};

