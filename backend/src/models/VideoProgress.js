const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    watchedSeconds: { type: Number, default: 0 },   // total seconds watched
    lastPosition: { type: Number, default: 0 },      // resume position in seconds
    duration: { type: Number, default: 0 },          // total video duration
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    watchSessions: [
      {
        startedAt: Date,
        endedAt: Date,
        from: Number,
        to: Number,
      },
    ],
  },
  { timestamps: true }
);

videoProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
videoProgressSchema.index({ student: 1, course: 1 });

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
