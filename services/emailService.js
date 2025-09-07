const nodemailer = require('nodemailer');

// Create a reusable transporter (singleton pattern)
let transporter = null;

const createTransporter = () => {
  if (!transporter) {
    // For development, you can use Gmail or other providers
    // You'll need to enable "Less secure app access" or use App Passwords
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS // your email password or app password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
};

const sendOTPEmail = async (email, otp, isPasswordReset = false) => {
  try {
    console.log('Attempting to send OTP email to:', email);
    console.log('Using email user:', process.env.EMAIL_USER);
    
    const transporter = createTransporter();
    
    const subject = isPasswordReset ? 'Password Reset - Rehabiri App' : 'Email Verification - Rehabiri App';
    const title = isPasswordReset ? 'Password Reset' : 'Email Verification';
    const message = isPasswordReset 
      ? 'You requested a password reset for your Rehabiri account.'
      : 'Thank you for signing up for Rehabiri!';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A84FF;">${title}</h2>
          <p>${message}</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #0A84FF; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this ${isPasswordReset ? 'password reset' : 'verification'}, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Rehabiri - Your Physiotherapy Management App</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return false;
  }
};

module.exports = {
  sendOTPEmail
};
