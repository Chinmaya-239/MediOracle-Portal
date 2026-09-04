const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  offerId: mongoose.Schema.Types.ObjectId,
  
  // Booking Status
  status: {
    type: String,
    enum: ['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'confirmed'
  },
  
  // Shift Information
  shiftDetails: {
    date: Date,
    startTime: String,
    endTime: String,
    duration: Number,
    role: String,
    department: String,
    location: String
  },
  
  // Dates
  bookingDate: {
    type: Date,
    default: Date.now
  },
  confirmationDate: Date,
  startDate: Date,
  endDate: Date,
  
  // Payment Information
  paymentDetails: {
    hourlyRate: Number,
    overtimeRate: Number,
    totalHours: Number,
    totalAmount: Number,
    currency: {
      type: String,
      default: 'EUR'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processed', 'paid', 'disputed'],
      default: 'pending'
    },
    paymentDate: Date,
    invoiceId: mongoose.Schema.Types.ObjectId
  },
  
  // Attendance
  attendance: {
    clockInTime: Date,
    clockOutTime: Date,
    actualHoursWorked: Number,
    noShow: {
      type: Boolean,
      default: false
    },
    noShowReason: String,
    earlyClockOut: {
      type: Boolean,
      default: false
    },
    lateClockIn: {
      type: Boolean,
      default: false
    }
  },
  
  // Quality & Feedback
  rating: {
    score: {
      type: Number,
      min: 0,
      max: 5
    },
    competence: Number,
    reliability: Number,
    communication: Number,
    teamwork: Number,
    patientInteraction: Number,
    feedback: String,
    ratedBy: mongoose.Schema.Types.ObjectId,
    ratedAt: Date
  },
  
  // Incidents & Issues
  incidents: [{
    type: String, // 'accident', 'complaint', 'disciplinary', 'commendation'
    description: String,
    reportedAt: Date,
    severity: String, // 'low', 'medium', 'high'
    status: String // 'reported', 'investigated', 'resolved'
  }],
  
  // Compliance Check
  complianceCheck: {
    credentialsVerified: Boolean,
    backgroundCheckClear: Boolean,
    immunizationsValid: Boolean,
    verifiedAt: Date
  },
  
  // Manager Approval
  managerApproval: {
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvalDate: Date,
    notes: String
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
bookingSchema.index({ shiftId: 1 });
bookingSchema.index({ professionalId: 1 });
bookingSchema.index({ facilityId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'shiftDetails.date': 1 });

// =============== METHODS ===============
// Start shift (clock in)
bookingSchema.methods.clockIn = async function(location) {
  this.status = 'in_progress';
  this.attendance.clockInTime = new Date();
  this.attendance.lateClockIn = this.attendance.clockInTime > new Date(this.shiftDetails.date.getTime() + 
    (parseInt(this.shiftDetails.startTime.split(':')[0]) * 60 + parseInt(this.shiftDetails.startTime.split(':')[1])) * 60000);
  return await this.save();
};

// End shift (clock out)
bookingSchema.methods.clockOut = async function() {
  this.attendance.clockOutTime = new Date();
  
  if (this.attendance.clockInTime) {
    const hoursWorked = (this.attendance.clockOutTime - this.attendance.clockInTime) / (1000 * 60 * 60);
    this.attendance.actualHoursWorked = Math.round(hoursWorked * 100) / 100;
  }
  
  this.status = 'completed';
  this.endDate = new Date();
  
  return await this.save();
};

// Record no-show
bookingSchema.methods.recordNoShow = async function(reason) {
  this.status = 'no_show';
  this.attendance.noShow = true;
  this.attendance.noShowReason = reason;
  return await this.save();
};

// Add rating
bookingSchema.methods.addRating = async function(ratingData) {
  this.rating = {
    score: ratingData.score,
    competence: ratingData.competence || ratingData.score,
    reliability: ratingData.reliability || ratingData.score,
    communication: ratingData.communication || ratingData.score,
    teamwork: ratingData.teamwork || ratingData.score,
    patientInteraction: ratingData.patientInteraction || ratingData.score,
    feedback: ratingData.feedback,
    ratedBy: ratingData.ratedBy,
    ratedAt: new Date()
  };
  return await this.save();
};

// Calculate payment
bookingSchema.methods.calculatePayment = function() {
  const regular = this.attendance.actualHoursWorked * this.paymentDetails.hourlyRate;
  const overtime = Math.max(0, this.attendance.actualHoursWorked - 8) * (this.paymentDetails.overtimeRate || 0);
  this.paymentDetails.totalAmount = regular + overtime;
  return this.paymentDetails.totalAmount;
};

// Approve by manager
bookingSchema.methods.approveByManager = async function(managerId, notes = '') {
  this.managerApproval.approvedBy = managerId;
  this.managerApproval.approvalStatus = 'approved';
  this.managerApproval.approvalDate = new Date();
  this.managerApproval.notes = notes;
  return await this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
