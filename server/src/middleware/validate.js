const { validationResult, body, param, query } = require('express-validator');
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
}
const validators = {
  email: body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  name: body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be 100 characters or less')
    .escape(),
  category: body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['transport', 'energy', 'food', 'waste', 'shopping'])
    .withMessage('Category must be one of: transport, energy, food, waste, shopping'),
  activityType: body('activity_type')
    .trim()
    .notEmpty()
    .withMessage('Activity type is required'),
  quantity: body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a non-negative number')
    .toFloat(),
  logDate: body('log_date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  habitName: body('name')
    .trim()
    .notEmpty()
    .withMessage('Habit name is required')
    .isLength({ max: 200 })
    .withMessage('Habit name must be 200 characters or less')
    .escape(),
  frequency: body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Frequency must be daily, weekly, or monthly'),
  idParam: param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .toInt(),
  paginationLimit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  paginationOffset: query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),
};
module.exports = { handleValidationErrors, validators };
