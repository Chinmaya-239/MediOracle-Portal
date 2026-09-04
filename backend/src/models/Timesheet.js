const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
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
  
  // Date & Time
  date: {
    type: Date,
    required: true
  },
  
  // Clock Events
  clockEvents: [{
    type: {
      type: String,
      enum: ['clock_in', 'clock_out', 'break_start', 'break_end']
    },
    time: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    gpsVerified: Boolean,
    deviceType: String, // 'mobile', 'kiosk', 'manual'
    notes: String
  }],
  
  // Totals
  totals: {
    punchInTime: Date,
    punchOutTime: Date,
    totalMinutesWorked: Number,
    breakMinutes: Number,
    overtimeMinutes: Number,
    regularMinutes: Number
  },
  
  // Approval Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'paid'],
    default: 'draft'
  },
  
  // Adjustments
  adjustments: [{
    type: String, // 'add_time', 'deduct_time', 'bonus'
    amount: Number, // minutes
    reason: String,
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date
  }],
  
  // Manager Approval
  approval: {
    submittedAt: Date,
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    rejectionReason: String,
    requiresCorrection: Boolean
  },
  
  // Manager Signature (photo/digital)
  managerSignature: {
    signatureUrl: String,
    signedAt: Date,
    signedBy: mongoose.Schema.Types.ObjectId
  },
  
  // Disputes
  dispute: {
    raised: Boolean,
    raisedBy: String, // 'professional' or 'facility'
    reason: String,
    raisedAt: Date,
    resolution: String,
    resolvedAt: Date
  },
  
  // Audit Trail
  auditLog: [{
    action: String,
    performedBy: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    details: String
  }],
  
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
timesheetSchema.index({ professionalId: 1, date: 1 });
timesheetSchema.index({ facilityId: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ date: 1 });

// =============== METHODS ===============
// Clock in
timesheetSchema.methods.clockIn = async function(location, deviceType = 'mobile') {
  this.clockEvents.push({
    type: 'clock_in',
    time: new Date(),
    location,
    deviceType,
    gpsVerified: !!location
  });
  
  if (!this.totals.punchInTime) {
    this.totals.punchInTime = new Date();
  }
  
  return await this.save();
};

// Clock out
timesheetSchema.methods.clockOut = async function(location, deviceType = 'mobile') {
  this.clockEvents.push({
    type: 'clock_out',
    time: new Date(),
    location,
    deviceType,
    gpsVerified: !!location
  });
  
  this.totals.punchOutTime = new Date();
  this.calculateTotals();
  
  return await this.save();
};

// Record break
timesheetSchema.methods.startBreak = async function() {
  this.clockEvents.push({
    type: 'break_start',
    time: new Date()
  });
  return await this.save();
};

timesheetSchema.methods.endBreak = async function() {
  this.clockEvents.push({
    type: 'break_end',
    time: new Date()
  });
  this.calculateTotals();
  return await this.save();
};

// Calculate totals
timesheetSchema.methods.calculateTotals = function() {
  if (!this.totals.punchInTime || !this.totals.punchOutTime) return;
  
  const totalMs = this.totals.punchOutTime - this.totals.punchInTime;
  const totalMinutes = totalMs / (1000 * 60);
  
  // Calculate break time
  let breakMinutes = 0;
  let inBreak = false;
  let breakStart = null;
  
  for (let event of this.clockEvents) {
    if (event.type === 'break_start') {
      inBreak = true;
      breakStart = event.time;
    } else if (event.type === 'break_end' && inBreak) {
      breakMinutes += (event.time - breakStart) / (1000 * 60);
      inBreak = false;
    }
  }
  
  this.totals.breakMinutes = Math.round(breakMinutes);
  this.totals.regularMinutes = totalMinutes - this.totals.breakMinutes;
  this.totals.overtimeMinutes = Math.max(0, (this.totals.regularMinutes - 480)); // 8 hours = 480 minutes
};

// Submit for approval
timesheetSchema.methods.submitForApproval = async function() {
  this.status = 'submitted';
  this.approval.submittedAt = new Date();
  this.addAuditLog('submitted', null, 'Timesheet submitted for approval');
  return await this.save();
};

// Approve
timesheetSchema.methods.approve = async function(approverId, notes = '') {
  this.status = 'approved';
  this.approval.approvedBy = approverId;
  this.approval.approvedAt = new Date();
  this.addAuditLog('approved', approverId, notes || 'Timesheet approved');
  return await this.save();
};

// Reject
timesheetSchema.methods.reject = async function(approverId, reason) {
  this.status = 'rejected';
  this.approval.rejectionReason = reason;
  this.approval.requiresCorrection = true;
  this.addAuditLog('rejected', approverId, reason);
  return await this.save();
};

// Add adjustment
timesheetSchema.methods.addAdjustment = async function(type, amount, reason, approverId) {
  this.adjustments.push({
    type,
    amount,
    reason,
    approvedBy: approverId,
    approvedAt: new Date()
  });
  
  if (type === 'add_time') {
    this.totals.regularMinutes += amount;
  } else if (type === 'deduct_time') {
    this.totals.regularMinutes = Math.max(0, this.totals.regularMinutes - amount);
  }
  
  this.addAuditLog('adjustment_added', approverId, `${type}: ${amount} minutes - ${reason}`);
  return await this.save();
};

// Add audit log
timesheetSchema.methods.addAuditLog = function(action, userId, details) {
  this.auditLog.push({
    action,
    performedBy: userId,
    timestamp: new Date(),
    details
  });
};

// Raise dispute
timesheetSchema.methods.raiseDispute = async function(raisedBy, reason) {
  this.dispute.raised = true;
  this.dispute.raisedBy = raisedBy;
  this.dispute.reason = reason;
  this.dispute.raisedAt = new Date();
  this.addAuditLog('dispute_raised', null, reason);
  return await this.save();
};

// Resolve dispute
timesheetSchema.methods.resolveDispute = async function(resolution) {
  this.dispute.resolution = resolution;
  this.dispute.resolvedAt = new Date();
  this.addAuditLog('dispute_resolved', null, resolution);
  return await this.save();
};

module.exports = mongoose.model('Timesheet', timesheetSchema);
