const mongoose = require('mongoose');

const StockLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  changeQty: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['sale', 'restock', 'expired', 'adjustment']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StockLog', StockLogSchema);
