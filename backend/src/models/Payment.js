const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Payment Reference
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  invoiceNumber: String,
  
  // Parties Involved
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
  
  // Payment Period
  paymentPeriodStart: Date,
  paymentPeriodEnd: Date,
  processedDate: Date,
  
  // Amount Calculation
  breakDown: {
    regularHours: {
      hours: Number,
      rate: Number,
      amount: Number
    },
    overtimeHours: {
      hours: Number,
      rate: Number,
      amount: Number
    },
    bonuses: Number,
    deductions: Number,
    adjustments: Number,
    taxes: Number,
    netAmount: Number
  },
  
  // Total
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'scheduled', 'processed', 'paid', 'failed', 'disputed', 'refunded'],
    default: 'pending'
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'instant_pay', 'check', 'cash'],
    default: 'bank_transfer'
  },
  
  // Bank Details
  bankDetails: {
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    sortCode: String,
    iban: String,
    accountVerified: Boolean
  },
  
  // Payment Dates
  scheduledPaymentDate: Date,
  actualPaymentDate: Date,
  
  // Approvals
  approvals: [{
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvalRole: String, // 'facility_manager', 'finance'
    approvedAt: Date,
    notes: String
  }],
  
  // Line Items (linked shifts)
  lineItems: [{
    bookingId: mongoose.Schema.Types.ObjectId,
    shiftDate: Date,
    role: String,
    hoursWorked: Number,
    hourlyRate: Number,
    amount: Number
  }],
  
  // Tax Information
  taxInfo: {
    taxableAmount: Number,
    taxRate: Number,
    taxAmount: Number,
    taxReference: String
  },
  
  // Deductions
  deductions: [{
    type: String, // 'tax', 'pension', 'loan', 'other'
    amount: Number,
    reason: String
  }],
  
  // Disputes
  dispute: {
    raised: Boolean,
    raisedBy: String, // 'professional' or 'facility'
    reason: String,
    raisedAt: Date,
    evidence: [String],
    resolution: String,
    resolvedAt: Date
  },
  
  // Instant Pay (if applicable)
  instantPay: {
    eligible: Boolean,
    requestedAt: Date,
    processedAt: Date,
    fee: Number // instant pay fee
  },
  
  // Remittance
  remittanceNote: String,
  remittanceUrl: String,
  
  // Audit
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
  
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
paymentSchema.index({ professionalId: 1 });
paymentSchema.index({ facilityId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ processedDate: -1 });
paymentSchema.index({ paymentId: 1 });

// =============== METHODS ===============
// Calculate net amount
paymentSchema.methods.calculateNetAmount = function() {
  const breakdown = this.breakDown;
  
  const regularPay = breakdown.regularHours.amount || 0;
  const overtimePay = breakdown.overtimeHours.amount || 0;
  const bonuses = breakdown.bonuses || 0;
  const adjustments = breakdown.adjustments || 0;
  
  const gross = regularPay + overtimePay + bonuses + adjustments;
  const deductions = breakdown.deductions || 0;
  const taxes = breakdown.taxes || 0;
  
  breakdown.netAmount = gross - deductions - taxes;
  this.totalAmount = breakdown.netAmount;
  
  return breakdown.netAmount;
};

// Add line item
paymentSchema.methods.addLineItem = async function(booking) {
  this.lineItems.push({
    bookingId: booking._id,
    shiftDate: booking.shiftDetails.date,
    role: booking.shiftDetails.role,
    hoursWorked: booking.attendance.actualHoursWorked,
    hourlyRate: booking.paymentDetails.hourlyRate,
    amount: booking.paymentDetails.totalAmount
  });
  return await this.save();
};

// Approve payment
paymentSchema.methods.approve = async function(approverId, approvalRole, notes = '') {
  this.approvals.push({
    approvedBy: approverId,
    approvalRole,
    approvedAt: new Date(),
    notes
  });
  
  // Check if all required approvals are done
  const requiresFinanceApproval = this.totalAmount > 5000;
  const hasFinanceApproval = this.approvals.some(a => a.approvalRole === 'finance');
  
  if (!requiresFinanceApproval || hasFinanceApproval) {
    this.status = 'approved';
  }
  
  return await this.save();
};

// Schedule payment
paymentSchema.methods.schedulePayment = async function(paymentDate) {
  this.scheduledPaymentDate = paymentDate;
  this.status = 'scheduled';
  return await this.save();
};

// Process payment
paymentSchema.methods.processPayment = async function() {
  this.status = 'processed';
  this.processedDate = new Date();
  return await this.save();
};

// Mark as paid
paymentSchema.methods.markAsPaid = async function() {
  this.status = 'paid';
  this.actualPaymentDate = new Date();
  return await this.save();
};

// Mark as failed
paymentSchema.methods.markAsFailed = async function() {
  this.status = 'failed';
  return await this.save();
};

// Refund payment
paymentSchema.methods.refund = async function(reason) {
  this.status = 'refunded';
  this.totalAmount = -this.totalAmount;
  this.deductions.push({
    type: 'refund',
    amount: -this.totalAmount,
    reason
  });
  return await this.save();
};

// Raise dispute
paymentSchema.methods.raiseDispute = async function(raisedBy, reason, evidence = []) {
  this.dispute.raised = true;
  this.dispute.raisedBy = raisedBy;
  this.dispute.reason = reason;
  this.dispute.evidence = evidence;
  this.dispute.raisedAt = new Date();
  this.status = 'disputed';
  return await this.save();
};

// Resolve dispute
paymentSchema.methods.resolveDispute = async function(resolution) {
  this.dispute.resolution = resolution;
  this.dispute.resolvedAt = new Date();
  this.status = 'paid';
  return await this.save();
};

// Generate remittance note
paymentSchema.methods.generateRemittance = function() {
  const note = `
Payment Summary
===============
Payment ID: ${this.paymentId}
Professional: ${this.professionalId}
Period: ${this.paymentPeriodStart} to ${this.paymentPeriodEnd}

Breakdown:
  Regular Hours: ${this.breakDown.regularHours.hours} hrs @ €${this.breakDown.regularHours.rate}/hr = €${this.breakDown.regularHours.amount}
  Overtime Hours: ${this.breakDown.overtimeHours.hours} hrs @ €${this.breakDown.overtimeHours.rate}/hr = €${this.breakDown.overtimeHours.amount}
  Bonuses: €${this.breakDown.bonuses}
  
Deductions:
  Tax: €${this.breakDown.taxes}
  Other: €${this.breakDown.deductions}

Total: €${this.totalAmount}

Status: ${this.status}
  `;
  
  this.remittanceNote = note;
  return note;
};

module.exports = mongoose.model('Payment', paymentSchema);
