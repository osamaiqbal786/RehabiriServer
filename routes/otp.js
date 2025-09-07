const express = require('express');
const router = express.Router();
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../services/emailService');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP
router.post('/send', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user already exists
    const User = require('../models/User');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Optimize database operations - use findOneAndUpdate with upsert
    const otpDoc = await OTP.findOneAndUpdate(
      { email },
      { 
        email,
        otp,
        expiresAt,
        isUsed: false
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    // Send email asynchronously (don't wait for it)
    sendOTPEmail(email, otp).catch(error => {
      console.error('Error sending OTP email:', error);
    });
    
    // For development/testing - also log the OTP to console
    console.log(`🔐 OTP for ${email}: ${otp}`);
    
    // Respond immediately
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log(`🔍 Verifying OTP for ${email}: ${otp}`);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find OTP
    const otpDoc = await OTP.findOne({ 
      email, 
      otp, 
      expiresAt: { $gt: new Date() },
      isUsed: false
    });

    console.log(`🔍 OTP document found:`, otpDoc ? 'Yes' : 'No');

    if (!otpDoc) {
      // Let's check what OTPs exist for this email
      const allOtps = await OTP.find({ email });
      console.log(`🔍 All OTPs for ${email}:`, allOtps.map(o => ({ otp: o.otp, isUsed: o.isUsed, expiresAt: o.expiresAt })));
      
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    console.log(`✅ OTP verified successfully for ${email}`);

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify OTP for password reset (doesn't mark as used)
router.post('/verify-password-reset', async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log(`🔍 Verifying password reset OTP for ${email}: ${otp}`);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find OTP (don't mark as used)
    const otpDoc = await OTP.findOne({ 
      email, 
      otp, 
      expiresAt: { $gt: new Date() },
      isUsed: false
    });

    console.log(`🔍 Password reset OTP document found:`, otpDoc ? 'Yes' : 'No');

    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    console.log(`✅ Password reset OTP verified successfully for ${email}`);

    // Don't mark OTP as used - that will happen during password reset
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying password reset OTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cleanup function to remove expired and used OTPs
const cleanupExpiredOTPs = async () => {
  try {
    const result = await OTP.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } }, // Expired OTPs
        { isUsed: true } // Used OTPs
      ]
    });
    console.log(`🧹 Cleaned up ${result.deletedCount} expired/used OTPs`);
  } catch (error) {
    console.error('Error cleaning up OTPs:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredOTPs, 60 * 60 * 1000);

// Also run cleanup on server start
cleanupExpiredOTPs();

module.exports = router;
