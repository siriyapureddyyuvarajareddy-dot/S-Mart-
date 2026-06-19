const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0.0
  },
  gstRate: {
    type: Number,
    default: 18.0
  },
  gstAmount: {
    type: Number,
    default: 0.0
  },
  discountAmount: {
    type: Number,
    default: 0.0
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const OrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  orderType: {
    type: String,
    required: true,
    enum: ['online', 'counter']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0.0
  },
  discountAmount: {
    type: Number,
    default: 0.0,
    min: 0.0
  },
  gstAmount: {
    type: Number,
    default: 0.0,
    min: 0.0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0.0
  },
  status: {
    type: String,
    default: 'completed',
    enum: ['pending', 'processing', 'completed', 'cancelled', 'out_for_delivery']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'upi', 'razorpay']
  },
  paymentStatus: {
    type: String,
    default: 'completed',
    enum: ['pending', 'completed', 'failed']
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  items: [OrderItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);
