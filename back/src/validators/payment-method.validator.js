const { z, idParamSchema, viewAsQuerySchema } = require('./common.validator');

const RESERVED_PAYMENT_METHOD = 'retiro de ahorros';

const paymentMethodNameSchema = z
  .string({ message: 'El nombre del medio de pago es requerido' })
  .trim()
  .min(1, 'El nombre del medio de pago es requerido')
  .max(50, 'El nombre no puede exceder 50 caracteres')
  .refine(
    (val) => val.toLowerCase() !== RESERVED_PAYMENT_METHOD,
    '«Retiro de Ahorros» es un medio de pago reservado del sistema'
  );

const createPaymentMethodSchema = z.object({
  name: paymentMethodNameSchema,
});

const updatePaymentMethodSchema = z.object({
  name: paymentMethodNameSchema,
});

module.exports = {
  paymentMethodNameSchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  idParamSchema,
  viewAsQuerySchema,
};

