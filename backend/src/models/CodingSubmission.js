const mongoose = require('mongoose');

const codingSubmissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'TestAttempt', default: null },
    language: {
      type: String,
      required: true,
      enum: ['javascript', 'python', 'java', 'cpp', 'c'],
    },
    code: { type: String, required: true },
    mode: { type: String, enum: ['run', 'submit'], default: 'run' },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'error', 'timeout'],
      default: 'pending',
    },
    testCaseResults: [
      {
        testCaseId: mongoose.Schema.Types.ObjectId,
        isHidden: Boolean,
        passed: Boolean,
        input: String,
        expectedOutput: String,
        actualOutput: String,
        executionTime: Number,  // ms
        error: String,
      },
    ],
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },          // 0–100
    executionTime: { type: Number, default: 0 },  // total ms
    error: { type: String },
  },
  { timestamps: true }
);

codingSubmissionSchema.index({ student: 1, question: 1 });

module.exports = mongoose.model('CodingSubmission', codingSubmissionSchema);
