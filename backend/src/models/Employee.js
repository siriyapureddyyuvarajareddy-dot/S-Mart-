const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  salary: {
    type: Number,
    required: true,
    default: 0.0,
    min: 0.0
  },
  shift: {
    type: String,
    required: true,
    enum: ['morning', 'afternoon', 'night']
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive']
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
