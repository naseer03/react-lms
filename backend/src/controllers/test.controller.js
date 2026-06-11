const testService = require('../services/test.service');
const { success, error } = require('../utils/apiResponse');

// ── Test CRUD (Admin) ─────────────────────────────────

const createTest = async (req, res, next) => {
  try {
    const test = await testService.createTest(req.body, req.user._id);
    return success(res, { test }, 'Test created', 201);
  } catch (err) { next(err); }
};

const getTests = async (req, res, next) => {
  try {
    const result = await testService.getTests(req.query);
    return success(res, result, 'Tests fetched');
  } catch (err) { next(err); }
};

const getTestById = async (req, res, next) => {
  try {
    const withQ = req.query.questions === 'true';
    const test = await testService.getTestById(req.params.id, withQ);
    return success(res, { test }, 'Test fetched');
  } catch (err) { next(err); }
};

const updateTest = async (req, res, next) => {
  try {
    const test = await testService.updateTest(req.params.id, req.body);
    return success(res, { test }, 'Test updated');
  } catch (err) { next(err); }
};

const deleteTest = async (req, res, next) => {
  try {
    await testService.deleteTest(req.params.id);
    return success(res, {}, 'Test deleted');
  } catch (err) { next(err); }
};

const publishTest = async (req, res, next) => {
  try {
    const test = await testService.publishTest(req.params.id);
    return success(res, { test }, 'Test published');
  } catch (err) { next(err); }
};

const getTestStats = async (req, res, next) => {
  try {
    const stats = await testService.getTestStats();
    return success(res, stats, 'Test stats fetched');
  } catch (err) { next(err); }
};

// ── Questions (Admin) ────────────────────────────────

const addQuestion = async (req, res, next) => {
  try {
    const question = await testService.addQuestion(req.params.testId, req.body, req.user._id);
    return success(res, { question }, 'Question added', 201);
  } catch (err) { next(err); }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await testService.updateQuestion(req.params.questionId, req.body);
    return success(res, { question }, 'Question updated');
  } catch (err) { next(err); }
};

const deleteQuestion = async (req, res, next) => {
  try {
    await testService.deleteQuestion(req.params.questionId);
    return success(res, {}, 'Question deleted');
  } catch (err) { next(err); }
};

const reorderQuestions = async (req, res, next) => {
  try {
    await testService.reorderQuestions(req.params.testId, req.body.orderedIds);
    return success(res, {}, 'Questions reordered');
  } catch (err) { next(err); }
};

// ── Attempt (Student) ─────────────────────────────────

const startAttempt = async (req, res, next) => {
  try {
    const result = await testService.startAttempt(req.params.testId, req.user._id);
    return success(res, result, result.resumed ? 'Attempt resumed' : 'Attempt started');
  } catch (err) { next(err); }
};

const saveDraft = async (req, res, next) => {
  try {
    const result = await testService.saveDraft(req.params.attemptId, req.user._id, req.body.draftAnswers);
    return success(res, result, 'Progress saved');
  } catch (err) { next(err); }
};

const submitAttempt = async (req, res, next) => {
  try {
    const result = await testService.submitAttempt(req.params.attemptId, req.user._id, req.body.answers);
    return success(res, result, 'Test submitted successfully');
  } catch (err) { next(err); }
};

const getAttemptResult = async (req, res, next) => {
  try {
    const attempt = await testService.getAttemptResult(req.params.attemptId, req.user._id, req.user.role);
    return success(res, { attempt }, 'Result fetched');
  } catch (err) { next(err); }
};

const getMyAttempts = async (req, res, next) => {
  try {
    const attempts = await testService.getStudentAttempts(req.params.testId, req.user._id);
    return success(res, { attempts }, 'Attempts fetched');
  } catch (err) { next(err); }
};

const getAllAttempts = async (req, res, next) => {
  try {
    const result = await testService.getAllAttempts(req.params.testId, req.query);
    return success(res, result, 'Attempts fetched');
  } catch (err) { next(err); }
};

module.exports = {
  createTest, getTests, getTestById, updateTest, deleteTest, publishTest, getTestStats,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  startAttempt, saveDraft, submitAttempt, getAttemptResult, getMyAttempts, getAllAttempts,
};
