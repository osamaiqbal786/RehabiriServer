const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  cancelled: {
    type: Boolean,
    default: false
  },
  amount: {
    type: Number,
    default: null,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for faster queries
sessionSchema.index({ userId: 1, date: 1 });
sessionSchema.index({ userId: 1, completed: 1, date: 1 });
sessionSchema.index({ userId: 1, cancelled: 1, date: 1 });
sessionSchema.index({ userId: 1, patientId: 1, date: 1 });
sessionSchema.index({ userId: 1, date: 1, completed: 1, cancelled: 1 });
sessionSchema.index({ patientId: 1, date: 1 });
sessionSchema.index({ date: 1, completed: 1 });
sessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
