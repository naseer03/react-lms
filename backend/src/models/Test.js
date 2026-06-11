const mongoose = require('mongoose');

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    type: { type: String, enum: ['quiz', 'exam', 'coding', 'mixed'], default: 'quiz' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },

    // Timing
    duration: { type: Number, default: 60 }, // minutes; 0 = unlimited
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },

    // Scoring
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkValue: { type: Number, default: 0.25 }, // fraction deducted per wrong MCQ

    // Behaviour
    maxAttempts: { type: Number, default: 1 }, // 0 = unlimited
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResultImmediately: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },

    // Instructions
    instructions: { type: String },

    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

testSchema.index({ course: 1 });
testSchema.index({ status: 1 });

module.exports = mongoose.model('Test', testSchema);
