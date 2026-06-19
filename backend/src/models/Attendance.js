const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  checkIn: {
    type: String, // HH:MM:SS
    default: null
  },
  checkOut: {
    type: String, // HH:MM:SS
    default: null
  },
  status: {
    type: String,
    default: 'absent',
    enum: ['present', 'absent', 'late', 'half-day']
  }
});

// Compound index to ensure single attendance record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
