const { z, idParamSchema, viewAsQuerySchema } = require('./common.validator');

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ICON_REGEX = /^[a-z0-9- ]+$/;

const categoryNameSchema = z
  .string({ message: 'El nombre es requerido' })
  .trim()
  .min(1, 'El nombre es requerido')
  .max(50, 'El nombre no puede exceder 50 caracteres');

const categoryColorSchema = z
  .string({ message: 'El color es requerido' })
  .trim()
  .regex(HEX_COLOR_REGEX, 'El color debe tener formato hexadecimal #RRGGBB');

const categoryIconSchema = z
  .string({ message: 'El icono es requerido' })
  .min(1, 'El icono es requerido')
  .max(30, 'El icono no puede exceder 30 caracteres')
  .refine(
    (val) => val.trim().length > 0 && ICON_REGEX.test(val),
    'El icono no puede exceder 30 caracteres y solo permite [a-z0-9- ]'
  );

const createCategorySchema = z.object({
  name: categoryNameSchema,
  color: categoryColorSchema,
  icon: categoryIconSchema,
});

const updateCategorySchema = z.object({
  name: categoryNameSchema.optional(),
  color: categoryColorSchema.optional(),
  icon: categoryIconSchema.optional(),
});

module.exports = {
  categoryNameSchema,
  categoryColorSchema,
  categoryIconSchema,
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
  viewAsQuerySchema,
};

