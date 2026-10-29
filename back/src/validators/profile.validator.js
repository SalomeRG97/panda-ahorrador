const { z } = require('./common.validator');
const {
  emailSchema,
  usernameSchema,
  nameSchema,
  changePasswordSchema,
} = require('./auth.validator');

const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
};

