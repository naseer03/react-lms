const Question = require('../models/Question');
const CodingSubmission = require('../models/CodingSubmission');
const TestAttempt = require('../models/TestAttempt');
const { runTestCases, executeInSandbox } = require('../utils/dockerSandbox');
const logger = require('../utils/logger');

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c'];

/**
 * Run code against sample test cases only (non-hidden).
 * Used when student clicks "Run".
 */
const runCode = async (studentId, questionId, language, code) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    const e = new Error(`Unsupported language: ${language}`); e.statusCode = 400; throw e;
  }

  const question = await Question.findById(questionId);
  if (!question || question.type !== 'coding') {
    const e = new Error('Coding question not found'); e.statusCode = 404; throw e;
  }

  // Only run visible test cases on "Run"
  const visibleCases = question.testCases.filter(tc => !tc.isHidden);

  const submission = await CodingSubmission.create({
    student: studentId,
    question: questionId,
    language,
    code,
    mode: 'run',
    status: 'running',
  });

  try {
    const results = await runTestCases(language, code, visibleCases, question.timeLimit);
    const passedCount = results.filter(r => r.passed).length;

    await CodingSubmission.findByIdAndUpdate(submission._id, {
      status: 'completed',
      testCaseResults: results,
      passedCount,
      totalCount: visibleCases.length,
      score: visibleCases.length > 0 ? Math.round((passedCount / visibleCases.length) * 100) : 0,
    });

    return {
      submissionId: submission._id,
      results,
      passedCount,
      totalCount: visibleCases.length,
      status: 'completed',
    };
  } catch (err) {
    await CodingSubmission.findByIdAndUpdate(submission._id, { status: 'error', error: err.message });
    throw err;
  }
};

/**
 * Submit code against ALL test cases (including hidden).
 * Used when student clicks "Submit" inside a test attempt.
 */
const submitCode = async (studentId, questionId, attemptId, language, code) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    const e = new Error(`Unsupported language: ${language}`); e.statusCode = 400; throw e;
  }

  const question = await Question.findById(questionId);
  if (!question || question.type !== 'coding') {
    const e = new Error('Coding question not found'); e.statusCode = 404; throw e;
  }

  const submission = await CodingSubmission.create({
    student: studentId,
    question: questionId,
    attempt: attemptId || null,
    language,
    code,
    mode: 'submit',
    status: 'running',
  });

  try {
    const results = await runTestCases(language, code, question.testCases, question.timeLimit);
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = question.testCases.length;
    const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    await CodingSubmission.findByIdAndUpdate(submission._id, {
      status: 'completed',
      testCaseResults: results,
      passedCount,
      totalCount,
      score,
    });

    // Update test attempt draft if provided
    if (attemptId) {
      const attempt = await TestAttempt.findById(attemptId);
      if (attempt) {
        const draft = attempt.draftAnswers || {};
        draft[questionId.toString()] = {
          codingAnswer: { language, code, testCaseResults: results, passedCount, totalCount },
        };
        attempt.draftAnswers = draft;
        await attempt.save();
      }
    }

    return {
      submissionId: submission._id,
      results,
      passedCount,
      totalCount,
      score,
      status: 'completed',
    };
  } catch (err) {
    await CodingSubmission.findByIdAndUpdate(submission._id, { status: 'error', error: err.message });
    throw err;
  }
};

/**
 * Run code against custom input (REPL-style "Run with custom input").
 */
const runWithCustomInput = async (language, code, input) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    const e = new Error(`Unsupported language: ${language}`); e.statusCode = 400; throw e;
  }

  const result = await executeInSandbox(language, code, input, 10000);
  return result;
};

const getSubmissionHistory = async (studentId, questionId) => {
  return CodingSubmission.find({ student: studentId, question: questionId })
    .select('language mode status passedCount totalCount score createdAt')
    .sort({ createdAt: -1 })
    .limit(10);
};

module.exports = { runCode, submitCode, runWithCustomInput, getSubmissionHistory };
