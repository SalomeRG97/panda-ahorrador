/**
 * Middleware de validación centralizada con Zod.
 * Parsea req.params, req.query y req.body según los esquemas proporcionados
 * y reemplaza las propiedades de req por los datos parseados/transformados.
 * Si falla, responde 400 con { success: false, message: 'Datos inválidos', errors: [{ field, message }] }.
 */
function formatZodIssues(zodError) {
  const issues = zodError?.issues || zodError?.errors || [];
  return issues.map((issue) => ({
    field: Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    const errors = [];

    if (params) {
      const parsedParams = params.safeParse(req.params ?? {});
      if (!parsedParams.success) {
        errors.push(...formatZodIssues(parsedParams.error));
      } else {
        req.params = parsedParams.data;
      }
    }

    if (query) {
      const parsedQuery = query.safeParse(req.query ?? {});
      if (!parsedQuery.success) {
        errors.push(...formatZodIssues(parsedQuery.error));
      } else {
        req.query = parsedQuery.data;
      }
    }

    if (body) {
      const parsedBody = body.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        errors.push(...formatZodIssues(parsedBody.error));
      } else {
        req.body = parsedBody.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors,
      });
    }

    return next();
  };
}

validate.validate = validate;
module.exports = validate;

