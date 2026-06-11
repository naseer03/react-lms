const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    duration: { type: Number, default: 0 }, // total seconds
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

moduleSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'module',
  options: { sort: { order: 1 } },
});

moduleSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Module', moduleSchema);
