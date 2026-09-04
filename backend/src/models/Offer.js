const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professional',
    required: true
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  
  // Offer Details
  offerStatus: {
    type: String,
    enum: ['sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'sent'
  },
  
  // Matching Information
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  matchReason: String,
  compatibilityFactors: {
    distance: Number,
    availability: Boolean,
    qualifications: Boolean,
    experience: Boolean,
    preferredFacility: Boolean,
    rate: Number
  },
  
  // Dates
  offerDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  viewedDate: Date,
  responseDate: Date,
  
  // Communication
  message: String,
  communicationMethod: {
    type: String,
    enum: ['email', 'sms', 'push_notification', 'in_app'],
    default: 'email'
  },
  
  // Response
  response: {
    status: String, // 'accepted' or 'rejected'
    reason: String, // reason for rejection
    respondedAt: Date
  },
  
  // Shift Details (for quick reference)
  shiftDetails: {
    role: String,
    date: Date,
    startTime: String,
    endTime: String,
    duration: Number,
    rate: Number,
    location: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// =============== INDEXES ===============
offerSchema.index({ shiftId: 1 });
offerSchema.index({ professionalId: 1 });
offerSchema.index({ facilityId: 1 });
offerSchema.index({ offerStatus: 1 });
offerSchema.index({ expiryDate: 1 });

// =============== METHODS ===============
// Accept offer
offerSchema.methods.accept = async function() {
  this.offerStatus = 'accepted';
  this.response.status = 'accepted';
  this.response.respondedAt = new Date();
  this.responseDate = new Date();
  return await this.save();
};

// Reject offer
offerSchema.methods.reject = async function(reason) {
  this.offerStatus = 'rejected';
  this.response.status = 'rejected';
  this.response.reason = reason;
  this.response.respondedAt = new Date();
  this.responseDate = new Date();
  return await this.save();
};

// Check if expired
offerSchema.methods.isExpired = function() {
  return this.expiryDate && this.expiryDate < new Date();
};

module.exports = mongoose.model('Offer', offerSchema);
