const jwt = require('jsonwebtoken');
const User = require('../models/User');

// =============== PROTECT ROUTES ===============
exports.protect = async (req, res, next) => {
  let token;
  
  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Ensure token exists
  if (!token) {
    return res.status(401).json({ 
      error: 'Not authorized to access this route',
      message: 'No token provided'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(404).json({ 
        error: 'User not found'
      });
    }
    
    if (!req.user.isActive) {
      return res.status(403).json({ 
        error: 'User account is inactive'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Not authorized to access this route',
      message: error.message
    });
  }
};

// =============== AUTHORIZE BY ROLE ===============
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'User role is not authorized to access this resource',
        role: req.user.role,
        required: roles
      });
    }
    next();
  };
};

// =============== PROFESSIONAL ONLY ===============
exports.isProfessional = (req, res, next) => {
  if (req.user.role !== 'professional') {
    return res.status(403).json({ 
      error: 'This resource is only available to professionals'
    });
  }
  next();
};

// =============== FACILITY MANAGER OR ADMIN ===============
exports.isFacilityStaff = (req, res, next) => {
  if (!['facility_manager', 'facility_admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'This resource is only available to facility staff'
    });
  }
  next();
};

// =============== AGENCY ADMIN ONLY ===============
exports.isAgencyAdmin = (req, res, next) => {
  if (req.user.role !== 'agency_admin') {
    return res.status(403).json({ 
      error: 'This resource is only available to agency administrators'
    });
  }
  next();
};

// =============== CHECK RESOURCE OWNERSHIP ===============
exports.checkOwnership = (resourceField = 'facilityId') => {
  return async (req, res, next) => {
    try {
      // For agency admin, allow access to all
      if (req.user.role === 'agency_admin') {
        return next();
      }
      
      // For facility staff, check if they belong to the facility
      if (['facility_manager', 'facility_admin'].includes(req.user.role)) {
        const resourceId = req.params.id;
        
        // Get resource from params and check ownership
        if (req.body[resourceField] && req.body[resourceField].toString() !== req.user.profileId.toString()) {
          return res.status(403).json({ 
            error: 'Not authorized to modify this resource'
          });
        }
      }
      
      next();
    } catch (error) {
      res.status(500).json({ 
        error: 'Server error',
        message: error.message 
      });
    }
  };
};

// =============== RATE LIMITING ===============
const rateLimit = require('express-rate-limit');

// Login rate limiter
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = exports;
