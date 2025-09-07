const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: false,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 150
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
patientSchema.index({ userId: 1, name: 1 });
patientSchema.index({ userId: 1, createdAt: -1 });
patientSchema.index({ name: 'text' });

module.exports = mongoose.model('Patient', patientSchema);
