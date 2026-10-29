const { z, idParamSchema } = require('./common.validator');
const {
  emailSchema,
  usernameSchema,
  nameSchema,
  strongPasswordSchema,
} = require('./auth.validator');

const roleEnum = z.enum(['admin', 'regular', 'viewer'], {
  message: "El rol debe ser 'admin', 'regular' o 'viewer'",
});

const optionalStrongPasswordSchema = z.preprocess(
  (val) => (val === null || val === undefined || (typeof val === 'string' && val.length === 0) ? undefined : val),
  strongPasswordSchema.optional()
);

const createUserSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  name: nameSchema,
  role: roleEnum,
  password: optionalStrongPasswordSchema,
});

const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  role: roleEnum.optional(),
  isActive: z.boolean({ message: 'isActive debe ser booleano' }).optional(),
});

const toggleStatusSchema = z.object({
  isActive: z.boolean({ message: 'isActive debe ser booleano' }),
});

module.exports = {
  roleEnum,
  createUserSchema,
  updateUserSchema,
  toggleStatusSchema,
  idParamSchema,
};

