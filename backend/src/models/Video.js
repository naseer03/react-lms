const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    originalFilename: { type: String, required: true },
    originalPath: { type: String }, // temp upload path (deleted after HLS)
    hlsPath: { type: String },      // dir: uploads/videos/hls/<videoId>/
    hlsManifest: { type: String },  // relative path to master.m3u8
    duration: { type: Number, default: 0 }, // seconds
    resolution: { type: String },   // e.g. "1920x1080"
    size: { type: Number, default: 0 }, // bytes
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed'],
      default: 'uploading',
    },
    processingError: { type: String },
    thumbnailPath: { type: String }, // auto-generated thumbnail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

videoSchema.index({ course: 1 });
videoSchema.index({ status: 1 });

module.exports = mongoose.model('Video', videoSchema);
