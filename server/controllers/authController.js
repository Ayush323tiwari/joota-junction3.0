const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../services/emailService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    // Validate input
    if (!email || !password) {
      console.log('Missing credentials:', { hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    console.log('User found:', { 
      found: !!user,
      userId: user?._id,
      email: user?.email
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password using bcrypt
    const isMatch = await user.comparePassword(password);
    console.log('Password comparison:', { 
      isMatch,
      providedPassword: password,
      storedPasswordHash: user.password
    });

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful:', { 
      userId: user._id,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Login failed' });
  }
};

// Generate and send OTP
const generateOtp = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Generate OTP request received:', { email });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP for:', email);

    try {
      // Delete any existing OTP for this email
      await Otp.deleteOne({ email });
      console.log('Deleted existing OTP for:', email);

      // Save new OTP
      const otpRecord = await Otp.create({ email, otp });
      console.log('Saved new OTP record:', { email, otpId: otpRecord._id });

      // Send OTP via email
      await sendOtpEmail(email, otp);
      console.log('OTP email sent successfully to:', email);

      res.status(200).json({ 
        message: 'OTP sent successfully',
        email: email
      });
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error('Failed to save or send OTP');
    }
  } catch (error) {
    console.error('Error in generateOtp:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Failed to generate OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify OTP and register user
const verifyOtpAndRegister = async (req, res) => {
  try {
    const { email, password, otp, name } = req.body;

    // Validate input
    if (!email || !password || !otp || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Validate name length
    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    // Find the OTP record
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: 'No OTP found for this email. Please generate a new OTP.' });
    }

    // Check if OTP has expired (5 minutes)
    const otpAge = Date.now() - otpRecord.createdAt;
    if (otpAge > 5 * 60 * 1000) {
      await Otp.deleteOne({ email });
      return res.status(400).json({ message: 'OTP has expired. Please generate a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Create new user (password will be hashed by the User model middleware)
    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
      emailVerified: true
    });

    // Delete the used OTP
    await Otp.deleteOne({ email });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Error in verifyOtpAndRegister:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
};

module.exports = {
  generateOtp,
  verifyOtpAndRegister,
  login
}; 