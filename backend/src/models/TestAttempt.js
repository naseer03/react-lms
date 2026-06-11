const mongoose = require('mongoose');

// Individual answer per question
const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  type: { type: String },

  // MCQ
  selectedOptions: [{ type: mongoose.Schema.Types.ObjectId }],

  // Short/Essay
  textAnswer: { type: String },

  // File upload
  fileAnswer: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
  },

  // Coding
  codingAnswer: {
    language: { type: String, enum: ['javascript', 'python', 'java', 'cpp', 'c'] },
    code: { type: String },
    testCaseResults: [
      {
        testCaseId: mongoose.Schema.Types.ObjectId,
        passed: Boolean,
        output: String,
        executionTime: Number,
        error: String,
      },
    ],
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
  },

  // Grading
  marksAwarded: { type: Number, default: null },  // null = not graded yet
  isCorrect: { type: Boolean, default: null },
  isGraded: { type: Boolean, default: false },
  gradedBy: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  feedback: { type: String },                      // Examiner feedback for essay/file
}, { _id: true });

const testAttemptSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNumber: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'timed_out', 'graded'],
      default: 'in_progress',
    },

    answers: [answerSchema],

    // Ordering (if shuffled)
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId }],

    // Timing
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    timeSpent: { type: Number, default: 0 },       // seconds

    // Scores
    totalMarks: { type: Number, default: 0 },
    marksObtained: { type: Number, default: null },
    percentage: { type: Number, default: null },
    isPassed: { type: Boolean, default: null },

    // Auto-save state (JSON blob of current answers for resume)
    draftAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSavedAt: { type: Date },

    gradedAt: { type: Date },
  },
  { timestamps: true }
);

testAttemptSchema.index({ test: 1, student: 1 });
testAttemptSchema.index({ student: 1 });
testAttemptSchema.index({ status: 1 });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
