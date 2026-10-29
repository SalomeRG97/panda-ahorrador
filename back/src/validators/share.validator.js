const { z, id } = require('./common.validator');
const { emailSchema } = require('./auth.validator');

const shareBodySchema = z
  .preprocess((val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const rawEmail = val.email !== undefined ? val.email : val.viewerEmail;
      return {
        ...val,
        email: rawEmail,
      };
    }
    return val;
  }, z.object({
    email: emailSchema,
  }))
  .transform((data) => ({
    email: data.email,
    viewerEmail: data.email,
  }));

const viewerIdParamSchema = z.object({
  viewerId: id,
});

module.exports = {
  shareBodySchema,
  viewerIdParamSchema,
};

