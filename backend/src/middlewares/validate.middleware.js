import { validationResult } from "express-validator";

/**
 * Express middleware that handles express-validator results.
 * - Returns 422 JSON when validation fails (also used for non-API requests for simplicity).
 * - Otherwise calls next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({
    param: e.param,
    msg: e.msg,
    value: e.value,
  }));

  // Detect API/XHR requests; respond with JSON. For simplicity non-API also returns JSON.
  const wantsJson =
    req.xhr ||
    req.headers.accept?.includes("application/json") ||
    req.path.startsWith("/api");

  return res.status(422).json({ success: false, errors: formatted });
};

export default validate;
export { validate };
