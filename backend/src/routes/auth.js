const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Professional = require('../models/Professional');
const Facility = require('../models/Facility');
const { protect, loginLimiter } = require('../middleware/auth');

// =============== GENERATE JWT TOKEN ===============
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// =============== REGISTER ===============
router.post('/register', loginLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, userType, phone } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        error: 'Please provide all required fields'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered'
      });
    }
    
    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: role || 'professional',
      userType: userType || 'individual'
    });
    
    // Generate token
    const token = generateToken(user._id);
    
    // Create profile based on role
    if (role === 'professional') {
      const professional = await Professional.create({
        firstName,
        lastName,
        email,
        phone,
        role: 'nurse' // Default role
      });
      
      user.profileId = professional._id;
      user.profileType = 'Professional';
      await user.save();
    }
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message 
    });
  }
});

// =============== LOGIN ===============
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password'
      });
    }
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials'
      });
    }
    
    // Check account lock
    if (user.isLocked()) {
      return res.status(403).json({ 
        error: 'Account locked. Try again after 30 minutes'
      });
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ 
        error: 'Invalid credentials'
      });
    }
    
    // Reset login attempts
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profileId: user.profileId
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message 
    });
  }
});

// =============== GET CURRENT USER ===============
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileId: user.profileId,
        profileType: user.profileType,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error fetching user',
      message: error.message 
    });
  }
});

// =============== UPDATE PROFILE ===============
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        phone: phone || req.user.phone,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicData()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Update failed',
      message: error.message 
    });
  }
});

// =============== CHANGE PASSWORD ===============
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required'
      });
    }
    
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Password change failed',
      message: error.message 
    });
  }
});

// =============== LOGOUT (Client-side token removal) ===============
router.post('/logout', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
});

// =============== VERIFY TOKEN ===============
router.get('/verify', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
