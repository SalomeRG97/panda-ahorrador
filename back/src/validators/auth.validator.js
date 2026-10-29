const { z } = require('./common.validator');

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

const emailSchema = z
  .string({ message: 'El email es requerido' })
  .trim()
  .toLowerCase()
  .min(1, 'El email es requerido')
  .max(255, 'El email no puede exceder 255 caracteres')
  .email('El formato del email no es válido');

const usernameSchema = z
  .string({ message: 'El nombre de usuario es requerido' })
  .trim()
  .min(3, 'El nombre de usuario debe tener entre 3 y 30 caracteres')
  .max(30, 'El nombre de usuario debe tener entre 3 y 30 caracteres')
  .regex(
    USERNAME_REGEX,
    'El nombre de usuario debe tener entre 3 y 30 caracteres y solo usar [a-zA-Z0-9_.]'
  );

const nameSchema = z
  .string({ message: 'El nombre es requerido' })
  .trim()
  .min(1, 'El nombre no puede estar vacío')
  .max(150, 'El nombre no puede exceder 150 caracteres');

const strongPasswordSchema = z
  .string({ message: 'La contraseña es requerida' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede exceder 128 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula')
  .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número')
  .regex(/[@$!%*?&.#_\-]/, 'La contraseña debe incluir al menos un carácter especial (@$!%*?&.#_-)');

const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: strongPasswordSchema,
  name: nameSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ message: 'La contraseña es requerida' })
    .min(1, 'La contraseña es requerida')
    .max(255, 'La contraseña no puede exceder 255 caracteres'),
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string({ message: 'La contraseña actual es requerida' })
    .min(1, 'La contraseña actual es requerida')
    .max(255, 'La contraseña actual no puede exceder 255 caracteres'),
  newPassword: strongPasswordSchema,
});

module.exports = {
  emailSchema,
  usernameSchema,
  nameSchema,
  strongPasswordSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
};

