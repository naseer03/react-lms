const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'FAILED_LOGIN',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET',
        'STUDENT_CREATED',
        'STUDENT_UPDATED',
        'STUDENT_BLOCKED',
        'STUDENT_DELETED',
        'COURSE_CREATED',
        'COURSE_UPDATED',
        'COURSE_DELETED',
        'COURSE_ACCESS',
        'VIDEO_WATCHED',
        'TEST_STARTED',
        'TEST_SUBMITTED',
        'CERTIFICATE_GENERATED',
        'REPORT_EXPORTED',
        'ADMIN_ACTION',
      ],
    },
    description: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
