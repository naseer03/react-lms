const mongoose = require('mongoose');

const backupLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['database', 'media'], required: true },
    status: { type: String, enum: ['running', 'success', 'failed'], default: 'running' },
    filename: String,
    sizeMB: Number,
    driveFileId: String,
    driveLink: String,
    duration: Number,   // seconds
    error: String,
    triggeredBy: { type: String, enum: ['cron', 'manual'], default: 'cron' },
  },
  { timestamps: true }
);

backupLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('BackupLog', backupLogSchema);
