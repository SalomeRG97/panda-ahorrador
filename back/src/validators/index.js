const common = require('./common.validator');
const auth = require('./auth.validator');
const profile = require('./profile.validator');
const year = require('./year.validator');
const month = require('./month.validator');
const week = require('./week.validator');
const saving = require('./saving.validator');
const income = require('./income.validator');
const expense = require('./expense.validator');
const challenge = require('./challenge.validator');
const category = require('./category.validator');
const paymentMethod = require('./payment-method.validator');
const share = require('./share.validator');
const admin = require('./admin.validator');
const summary = require('./summary.validator');

module.exports = {
  common,
  auth,
  profile,
  year,
  month,
  week,
  saving,
  income,
  expense,
  challenge,
  category,
  paymentMethod,
  share,
  admin,
  summary,
};

