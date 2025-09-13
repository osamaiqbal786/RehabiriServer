const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  address: {
    houseNumber: {
      type: String,
      trim: true
    },
    area: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },
  highestQualification: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
