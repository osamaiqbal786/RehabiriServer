const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, phoneNumber, password, profileImage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Verify OTP before registration
    const OTP = require('../models/OTP');
    const verifiedOTP = await OTP.findOne({ 
      email, 
      isUsed: true,
      expiresAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Used within last 10 minutes
    });

    if (!verifiedOTP) {
      return res.status(400).json({ error: 'Please verify your email with OTP first' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      email,
      phoneNumber,
      password: hashedPassword,
      profileImage
    });

    await user.save();

    // Clean up used OTP
    await OTP.deleteMany({ email });

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email, phoneNumber, profileImage } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Send password reset OTP
router.post('/forgot-password', async (req, res) => {
  const startTime = Date.now();
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate OTP
    const OTP = require('../models/OTP');
    const generateOTP = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

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
    const { sendOTPEmail } = require('../services/emailService');
    sendOTPEmail(email, otp, true).catch(error => {
      console.error('Error sending password reset OTP email:', error);
    });
    
    // For development/testing - also log the OTP to console
    console.log(`🔐 Password Reset OTP for ${email}: ${otp}`);
    
    // Respond immediately
    const responseTime = Date.now() - startTime;
    console.log(`⚡ Password reset OTP API response time: ${responseTime}ms`);
    res.json({ message: 'Password reset OTP sent successfully' });
    
  } catch (error) {
    console.error('Error sending password reset OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify password reset OTP and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify OTP
    const OTP = require('../models/OTP');
    const otpDoc = await OTP.findOne({ 
      email, 
      otp, 
      expiresAt: { $gt: new Date() },
      isUsed: false
    });

    if (!otpDoc) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Clean up used OTP
    await OTP.deleteMany({ email });

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
