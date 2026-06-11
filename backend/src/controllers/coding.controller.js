const codingService = require('../services/coding.service');
const { success, error } = require('../utils/apiResponse');

const runCode = async (req, res, next) => {
  try {
    const { questionId, language, code } = req.body;
    if (!questionId || !language || !code) return error(res, 'questionId, language, and code are required', 400);
    const result = await codingService.runCode(req.user._id, questionId, language, code);
    return success(res, result, 'Code executed');
  } catch (err) { next(err); }
};

const submitCode = async (req, res, next) => {
  try {
    const { questionId, attemptId, language, code } = req.body;
    if (!questionId || !language || !code) return error(res, 'questionId, language, and code are required', 400);
    const result = await codingService.submitCode(req.user._id, questionId, attemptId, language, code);
    return success(res, result, 'Code submitted');
  } catch (err) { next(err); }
};

const runCustomInput = async (req, res, next) => {
  try {
    const { language, code, input } = req.body;
    if (!language || !code) return error(res, 'language and code are required', 400);
    const result = await codingService.runWithCustomInput(language, code, input || '');
    return success(res, result, 'Code executed');
  } catch (err) { next(err); }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await codingService.getSubmissionHistory(req.user._id, req.params.questionId);
    return success(res, { history }, 'History fetched');
  } catch (err) { next(err); }
};

module.exports = { runCode, submitCode, runCustomInput, getHistory };
