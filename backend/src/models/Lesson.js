const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['video', 'pdf', 'text', 'quiz'],
      default: 'video',
    },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    isFreePreview: { type: Boolean, default: false },
    duration: { type: Number, default: 0 }, // seconds for video
    // For text lessons
    content: { type: String },
    // For PDF lessons
    pdfFile: {
      filename: String,
      originalName: String,
      size: Number,
      path: String,
    },
    // For video lessons — reference to Video doc
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      default: null,
    },
  },
  { timestamps: true }
);

lessonSchema.index({ module: 1, order: 1 });
lessonSchema.index({ course: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
