const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  tier: {
    type: String,
    default: 'Silver',
    enum: ['Silver', 'Gold', 'Platinum']
  }
});

module.exports = mongoose.model('Customer', CustomerSchema);
