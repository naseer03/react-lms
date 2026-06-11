const mongoose = require('mongoose');

// ── Option sub-schema ──────────────────────────────────
const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: true });

// ── Test case sub-schema (for coding questions) ────────
const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  points: { type: Number, default: 1 },
  explanation: { type: String },
}, { _id: true });

// ── Main Question schema ───────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    type: {
      type: String,
      required: true,
      enum: [
        'mcq_single',   // single-select radio
        'mcq_multi',    // multi-select checkbox
        'short_text',   // short answer
        'long_essay',   // long-form essay
        'file_upload',  // file submission
        'coding',       // coding challenge
      ],
    },
    text: { type: String, required: true },         // Question body (markdown supported)
    explanation: { type: String },                  // Explanation shown after submission
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    tags: [String],

    // MCQ options
    options: [optionSchema],

    // Short/Essay
    expectedAnswer: { type: String },               // For auto-grading short text
    wordLimit: { type: Number, default: 0 },

    // File upload
    allowedFileTypes: [String],
    maxFileSize: { type: Number, default: 5 },      // MB

    // Coding specific
    problemStatement: { type: String },
    constraints: { type: String },
    inputFormat: { type: String },
    outputFormat: { type: String },
    sampleInput: { type: String },
    sampleOutput: { type: String },
    starterCode: {
      javascript: { type: String, default: '// Write your solution here\n' },
      python: { type: String, default: '# Write your solution here\n' },
      java: { type: String, default: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n' },
      cpp: { type: String, default: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
      c: { type: String, default: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
    },
    testCases: [testCaseSchema],
    timeLimit: { type: Number, default: 2000 },     // ms per test case
    memoryLimit: { type: Number, default: 256 },    // MB

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

questionSchema.index({ test: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
