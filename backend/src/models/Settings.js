const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },

    // Institute branding
    instituteName: { type: String, default: 'LMS Platform' },
    logo: { type: String, default: null },              // uploads/images/<filename>
    favicon: { type: String, default: null },
    primaryColor: { type: String, default: '#4f46e5' },

    // Certificate template
    certBackground: { type: String, default: null },    // uploads/cert-assets/
    certHeaderText: { type: String, default: 'Certificate of Completion' },
    certSubHeaderText: { type: String, default: 'This is to certify that' },
    certBodyText: { type: String, default: 'has successfully completed the course' },
    certFooterText: { type: String, default: 'Issued with pride by' },
    certSignature: { type: String, default: null },     // uploads/cert-assets/
    certSignatoryName: { type: String, default: 'Director' },
    certSignatoryTitle: { type: String, default: 'Institute Director' },
    certBorderColor: { type: String, default: '#4f46e5' },
    certAccentColor: { type: String, default: '#7c3aed' },

    // Email
    smtpOverride: { type: Boolean, default: false },

    // Features
    allowStudentSelfRegister: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
