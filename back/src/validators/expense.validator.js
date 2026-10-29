const { z, id, date, money, concept, idParamSchema, viewAsQuerySchema } = require('./common.validator');

const frequencyEnum = z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
  message: 'Frecuencia de repetición no válida',
});

const scopeEnum = z.enum(['single', 'future', 'all'], {
  message: "El alcance (scope) debe ser 'single', 'future' o 'all'",
});

const recurrenceSchema = z.object({
  frequency: frequencyEnum,
  end_date: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : val),
      date.nullable().optional()
    )
    .default(null),
});

const paymentMethodField = z
  .union([
    z.string().trim().max(100, 'El medio de pago no puede exceder 100 caracteres'),
    z.number().int().positive(),
  ])
  .nullable()
  .optional();

const createBudgetExpenseSchema = z
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
    week_id: id.nullable().optional(),
    category_id: id,
    date,
    concept,
    budget_amount: money,
    real_amount: money.nullable().optional().default(0),
    payment_method: paymentMethodField.default(''),
    payment_method_id: id.nullable().optional(),
    recurrence: recurrenceSchema.nullable().optional(),
  }))
  .superRefine((data, ctx) => {
    if (data.recurrence && data.recurrence.end_date && data.date) {
      if (data.recurrence.end_date < data.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurrence', 'end_date'],
          message: 'La fecha final no puede ser anterior a la fecha del gasto',
        });
      }
    }
  });

const updateBudgetExpenseSchema = z
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
    week_id: id.nullable().optional(),
    category_id: id.optional(),
    date: date.optional(),
    concept: concept.optional(),
    budget_amount: money.optional(),
    real_amount: money.nullable().optional(),
    payment_method: paymentMethodField,
    payment_method_id: id.nullable().optional(),
    scope: scopeEnum.optional().default('single'),
  }));

const deleteBudgetQuerySchema = z.object({
  viewAs: id.optional(),
  scope: scopeEnum.optional(),
});

const deleteBudgetBodySchema = z.object({
  scope: scopeEnum.optional(),
});

const createExtraExpenseSchema = z
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
    week_id: id.nullable().optional(),
    category_id: id,
    date,
    concept,
    amount: money,
    payment_method: paymentMethodField.default(''),
    payment_method_id: id.nullable().optional(),
  }));

const updateExtraExpenseSchema = z
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
    week_id: id.nullable().optional(),
    category_id: id.optional(),
    date: date.optional(),
    concept: concept.optional(),
    amount: money.optional(),
    payment_method: paymentMethodField,
    payment_method_id: id.nullable().optional(),
  }));

module.exports = {
  frequencyEnum,
  scopeEnum,
  recurrenceSchema,
  createBudgetExpenseSchema,
  updateBudgetExpenseSchema,
  deleteBudgetQuerySchema,
  deleteBudgetBodySchema,
  createExtraExpenseSchema,
  updateExtraExpenseSchema,
  idParamSchema,
  viewAsQuerySchema,
};

