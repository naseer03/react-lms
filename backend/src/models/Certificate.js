const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      unique: true,
      required: true,
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    studentName: { type: String, required: true },
    courseName: { type: String, required: true },
    completionDate: { type: Date, default: Date.now },
    issuedAt: { type: Date, default: Date.now },

    pdfPath: { type: String },                        // relative path in uploads/certificates/
    verificationUrl: { type: String },
    qrCodePath: { type: String },

    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    revokedAt: { type: Date },
    revokedReason: { type: String },

    // Snapshot of settings at generation time
    templateSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

certificateSchema.index({ student: 1, course: 1 });

// Auto-generate certificate number before validation
certificateSchema.pre('validate', async function (next) {
  if (!this.isNew || this.certificateNumber) return next();
  const year = new Date().getFullYear();
  const seq = await mongoose.model('Certificate').countDocuments() + 1;
  this.certificateNumber = `LMS-${year}-${String(seq).padStart(6, '0')}`;
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
