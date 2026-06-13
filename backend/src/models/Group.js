const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    assignedTests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
