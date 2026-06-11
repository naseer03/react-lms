const Test = require('../models/Test');
const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const { sendEmail } = require('../utils/email');

// ── Test CRUD ──────────────────────────────────────────

const createTest = async (data, adminId) => {
  return Test.create({ ...data, createdBy: adminId });
};

const getTests = async ({ page = 1, limit = 10, search = '', status = '', courseId = '' }) => {
  const query = {};
  if (status) query.status = status;
  if (courseId) query.course = courseId;
  if (search) query.$or = [
    { title: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [tests, total] = await Promise.all([
    Test.find(query)
      .populate('course', 'title')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Test.countDocuments(query),
  ]);

  // Attach question count to each test
  const testsWithCount = await Promise.all(tests.map(async (t) => {
    const qCount = await Question.countDocuments({ test: t._id });
    return { ...t.toJSON(), questionCount: qCount };
  }));

  return { tests: testsWithCount, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
};

const getTestById = async (id, includeQuestions = false) => {
  const test = await Test.findById(id)
    .populate('course', 'title')
    .populate('createdBy', 'name');

  if (!test) { const e = new Error('Test not found'); e.statusCode = 404; throw e; }

  if (includeQuestions) {
    const questions = await Question.find({ test: id }).sort({ order: 1 });
    return { ...test.toJSON(), questions };
  }

  return test;
};

const updateTest = async (id, data) => {
  const test = await Test.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!test) { const e = new Error('Test not found'); e.statusCode = 404; throw e; }
  return test;
};

const deleteTest = async (id) => {
  await Question.deleteMany({ test: id });
  await TestAttempt.deleteMany({ test: id });
  const test = await Test.findByIdAndDelete(id);
  if (!test) { const e = new Error('Test not found'); e.statusCode = 404; throw e; }
};

const publishTest = async (id) => {
  const qCount = await Question.countDocuments({ test: id });
  if (qCount === 0) { const e = new Error('Cannot publish test with no questions'); e.statusCode = 400; throw e; }
  return Test.findByIdAndUpdate(id, { status: 'published' }, { new: true });
};

// ── Question CRUD ──────────────────────────────────────

const addQuestion = async (testId, data, adminId) => {
  const test = await Test.findById(testId);
  if (!test) { const e = new Error('Test not found'); e.statusCode = 404; throw e; }

  const count = await Question.countDocuments({ test: testId });
  const question = await Question.create({
    ...data,
    test: testId,
    course: test.course,
    order: count,
    createdBy: adminId,
  });

  // Recalculate total marks
  await recalcTotalMarks(testId);

  return question;
};

const updateQuestion = async (questionId, data) => {
  const question = await Question.findByIdAndUpdate(questionId, data, { new: true });
  if (!question) { const e = new Error('Question not found'); e.statusCode = 404; throw e; }
  if (question.test) await recalcTotalMarks(question.test);
  return question;
};

const deleteQuestion = async (questionId) => {
  const question = await Question.findByIdAndDelete(questionId);
  if (!question) { const e = new Error('Question not found'); e.statusCode = 404; throw e; }
  if (question.test) await recalcTotalMarks(question.test);
};

const reorderQuestions = async (testId, orderedIds) => {
  await Promise.all(orderedIds.map((id, idx) =>
    Question.findOneAndUpdate({ _id: id, test: testId }, { order: idx })
  ));
};

const recalcTotalMarks = async (testId) => {
  const agg = await Question.aggregate([
    { $match: { test: require('mongoose').Types.ObjectId.createFromHexString(testId.toString()) } },
    { $group: { _id: null, total: { $sum: '$marks' } } },
  ]);
  const total = agg[0]?.total || 0;
  await Test.findByIdAndUpdate(testId, { totalMarks: total });
  return total;
};

// ── Attempt Management ─────────────────────────────────

const startAttempt = async (testId, studentId) => {
  const test = await Test.findById(testId).populate('questions');
  if (!test) { const e = new Error('Test not found'); e.statusCode = 404; throw e; }
  if (test.status !== 'published') { const e = new Error('Test is not available'); e.statusCode = 403; throw e; }

  // Check attempts
  if (test.maxAttempts > 0) {
    const attemptCount = await TestAttempt.countDocuments({ test: testId, student: studentId, status: { $ne: 'in_progress' } });
    if (attemptCount >= test.maxAttempts) {
      const e = new Error(`Maximum attempts (${test.maxAttempts}) reached`); e.statusCode = 403; throw e;
    }
  }

  // Check for existing in-progress attempt
  const existing = await TestAttempt.findOne({ test: testId, student: studentId, status: 'in_progress' });
  if (existing) return { attempt: existing, test, resumed: true };

  const attemptNumber = (await TestAttempt.countDocuments({ test: testId, student: studentId })) + 1;

  // Shuffle if required
  let questions = await Question.find({ test: testId }).sort({ order: 1 });
  let questionOrder = questions.map(q => q._id);
  if (test.shuffleQuestions) {
    questionOrder = questionOrder.sort(() => Math.random() - 0.5);
  }

  const attempt = await TestAttempt.create({
    test: testId,
    student: studentId,
    attemptNumber,
    questionOrder,
    totalMarks: test.totalMarks,
    status: 'in_progress',
    draftAnswers: {},
  });

  return { attempt, test, resumed: false };
};

const saveDraft = async (attemptId, studentId, draftAnswers) => {
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: studentId, status: 'in_progress' });
  if (!attempt) { const e = new Error('Active attempt not found'); e.statusCode = 404; throw e; }
  attempt.draftAnswers = draftAnswers;
  attempt.lastSavedAt = new Date();
  await attempt.save();
  return { lastSavedAt: attempt.lastSavedAt };
};

const submitAttempt = async (attemptId, studentId, finalAnswers) => {
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: studentId, status: 'in_progress' });
  if (!attempt) { const e = new Error('Active attempt not found'); e.statusCode = 404; throw e; }

  const test = await Test.findById(attempt.test);
  const questions = await Question.find({ test: attempt.test });

  const answers = [];
  let marksObtained = 0;

  for (const question of questions) {
    const studentAnswer = finalAnswers?.[question._id.toString()];
    if (!studentAnswer) {
      answers.push({ question: question._id, type: question.type, marksAwarded: 0, isGraded: true });
      continue;
    }

    let marksAwarded = 0;
    let isCorrect = null;
    let isGraded = true;

    switch (question.type) {
      case 'mcq_single': {
        const selected = studentAnswer.selectedOptions || [];
        const correctIds = question.options.filter(o => o.isCorrect).map(o => o._id.toString());
        isCorrect = selected.length === 1 && correctIds.includes(selected[0]);
        if (isCorrect) marksAwarded = question.marks;
        else if (test.negativeMarking && selected.length > 0) marksAwarded = -(question.marks * test.negativeMarkValue);
        break;
      }
      case 'mcq_multi': {
        const selected = studentAnswer.selectedOptions || [];
        const correctIds = question.options.filter(o => o.isCorrect).map(o => o._id.toString());
        const allCorrectSelected = correctIds.every(id => selected.includes(id));
        const noWrongSelected = selected.every(id => correctIds.includes(id));
        isCorrect = allCorrectSelected && noWrongSelected;
        if (isCorrect) marksAwarded = question.marks;
        else if (test.negativeMarking && selected.length > 0) marksAwarded = -(question.marks * test.negativeMarkValue);
        break;
      }
      case 'short_text': {
        const text = (studentAnswer.textAnswer || '').trim().toLowerCase();
        const expected = (question.expectedAnswer || '').trim().toLowerCase();
        isCorrect = expected ? text === expected : null;
        marksAwarded = isCorrect ? question.marks : 0;
        isGraded = !!expected;
        break;
      }
      case 'long_essay':
      case 'file_upload':
        // Manual grading required
        isGraded = false;
        marksAwarded = null;
        isCorrect = null;
        break;
      case 'coding': {
        const coding = studentAnswer.codingAnswer;
        const passed = coding?.passedCount || 0;
        const total = coding?.totalCount || 0;
        marksAwarded = total > 0 ? Math.round((passed / total) * question.marks * 100) / 100 : 0;
        isCorrect = passed === total && total > 0;
        break;
      }
    }

    if (marksAwarded !== null) marksObtained += marksAwarded;

    answers.push({
      question: question._id,
      type: question.type,
      selectedOptions: studentAnswer.selectedOptions,
      textAnswer: studentAnswer.textAnswer,
      fileAnswer: studentAnswer.fileAnswer,
      codingAnswer: studentAnswer.codingAnswer,
      marksAwarded,
      isCorrect,
      isGraded,
      gradedBy: 'auto',
    });
  }

  const percentage = test.totalMarks > 0 ? Math.round((marksObtained / test.totalMarks) * 100) : 0;
  const isPassed = marksObtained >= test.passingMarks;
  const timeSpent = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

  attempt.answers = answers;
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.marksObtained = marksObtained;
  attempt.percentage = percentage;
  attempt.isPassed = isPassed;
  attempt.timeSpent = timeSpent;
  attempt.draftAnswers = {};
  await attempt.save();

  return { attempt, test, isPassed, percentage, marksObtained };
};

const getAttemptResult = async (attemptId, requesterId, requesterRole) => {
  const attempt = await TestAttempt.findById(attemptId)
    .populate('test')
    .populate({ path: 'answers.question', select: 'text type options marks explanation' });

  if (!attempt) { const e = new Error('Attempt not found'); e.statusCode = 404; throw e; }
  if (requesterRole !== 'admin' && attempt.student.toString() !== requesterId.toString()) {
    const e = new Error('Access denied'); e.statusCode = 403; throw e;
  }

  return attempt;
};

const getStudentAttempts = async (testId, studentId) => {
  return TestAttempt.find({ test: testId, student: studentId })
    .select('attemptNumber status marksObtained percentage isPassed startedAt submittedAt timeSpent')
    .sort({ attemptNumber: -1 });
};

const getAllAttempts = async (testId, { page = 1, limit = 20 }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [attempts, total] = await Promise.all([
    TestAttempt.find({ test: testId })
      .populate('student', 'name email')
      .select('student attemptNumber status marksObtained percentage isPassed submittedAt timeSpent')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TestAttempt.countDocuments({ test: testId }),
  ]);
  return { attempts, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
};

const getTestStats = async () => {
  const [total, published, totalAttempts, passed] = await Promise.all([
    Test.countDocuments(),
    Test.countDocuments({ status: 'published' }),
    TestAttempt.countDocuments({ status: 'submitted' }),
    TestAttempt.countDocuments({ status: 'submitted', isPassed: true }),
  ]);
  return { total, published, totalAttempts, passed, passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0 };
};

module.exports = {
  createTest, getTests, getTestById, updateTest, deleteTest, publishTest,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  startAttempt, saveDraft, submitAttempt, getAttemptResult,
  getStudentAttempts, getAllAttempts, getTestStats,
};
