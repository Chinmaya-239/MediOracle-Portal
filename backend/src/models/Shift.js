const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Shift title is required'],
    trim: true
  },
  description: String,
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  departmentId: mongoose.Schema.Types.ObjectId,
  
  // Role & Requirements
  role: {
    type: String,
    enum: ['nurse', 'hca', 'pharmacist', 'technician', 'midwife', 'allied_health'],
    required: true
  },
  specialties: [String], // e.g., ['ICU', 'Emergency']
  
  // Schedule
  shiftDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // "08:00"
    required: true
  },
  endTime: {
    type: String, // "16:00"
    required: true
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  shiftType: {
    type: String,
    enum: ['morning', 'afternoon', 'night', 'flexible'],
    default: 'flexible'
  },
  recurrence: {
    type: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly'],
      default: 'once'
    },
    daysOfWeek: [String], // ['monday', 'tuesday', ...]
    endDate: Date,
    occurrences: Number
  },
  
  // Location
  location: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Staffing Requirements
  positionsNeeded: {
    type: Number,
    default: 1,
    required: true
  },
  requiredRatios: {
    nurseToCareAssistant: Number,
    patientToNurse: Number
  },
  requiredCredentials: [String], // ['NMBI License', 'BLS', 'ACLS']
  requiredLanguages: [String],
  experienceRequired: String, // 'junior', 'intermediate', 'senior'
  
  // Compensation
  rate: {
    hourly: {
      type: Number,
      required: true
    },
    overtime: Number,
    bonus: Number,
    currency: {
      type: String,
      default: 'EUR'
    }
  },
  incentives: {
    breakfastProvided: Boolean,
    transportProvided: Boolean,
    parkingAvailable: Boolean,
    uniformProvided: Boolean,
    insuranceCovered: Boolean,
    bonusForOnTimeCompletion: Number
  },
  
  // Breaks
  breaks: [{
    type: String, // 'paid' or 'unpaid'
    duration: Number, // in minutes
    timeOffset: Number // minutes from shift start
  }],
  
  // Status & State
  status: {
    type: String,
    enum: ['draft', 'posted', 'filled', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  postedDate: Date,
  completedDate: Date,
  cancelledDate: Date,
  cancellationReason: String,
  
  // Filling Progress
  positions: [{
    status: {
      type: String,
      enum: ['open', 'offered', 'accepted', 'completed', 'cancelled'],
      default: 'open'
    },
    professionalId: mongoose.Schema.Types.ObjectId,
    offerId: mongoose.Schema.Types.ObjectId,
    applicationDate: Date,
    acceptanceDate: Date,
    completionDate: Date,
    rating: {
      score: Number,
      feedback: String,
      ratedBy: mongoose.Schema.Types.ObjectId
    },
    noShow: Boolean,
    noShowReason: String
  }],
  
  // Additional Details
  acuity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  trainingLevel: String,
  notes: String,
  
  // Monitoring
  timeToFill: Number, // hours to fill position
  applicationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  
  // Visibility
  isPublic: {
    type: Boolean,
    default: true
  },
  targetCandidates: [mongoose.Schema.Types.ObjectId],
  
  // Audit Trail
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
  
  timestamps: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, { 
  timestamps: true,
  collection: 'shifts'
});

// =============== INDEXES ===============
shiftSchema.index({ facilityId: 1 });
shiftSchema.index({ shiftDate: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ role: 1 });
shiftSchema.index({ 'location.coordinates': '2dsphere' });
shiftSchema.index({ postedDate: -1 });

// =============== VIRTUAL FIELDS ===============
shiftSchema.virtual('filledPositions').get(function() {
  return this.positions.filter(p => p.status === 'accepted').length;
});

shiftSchema.virtual('openPositions').get(function() {
  return this.positionsNeeded - this.filledPositions;
});

shiftSchema.virtual('isFilled').get(function() {
  return this.filledPositions >= this.positionsNeeded;
});

shiftSchema.virtual('totalEarnings').get(function() {
  return this.rate.hourly * this.duration;
});

// =============== MIDDLEWARE ===============
// Calculate duration
shiftSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    
    let duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (duration < 0) duration += 24 * 60; // Handle overnight shifts
    
    this.duration = Math.round(duration / 60 * 10) / 10; // hours with decimals
  }
  next();
});

// =============== METHODS ===============
// Get available positions
shiftSchema.methods.getAvailablePositions = function() {
  return this.positions.filter(p => p.status === 'open');
};

// Get filled positions
shiftSchema.methods.getFilledPositions = function() {
  return this.positions.filter(p => p.status === 'accepted');
};

// Check if position is available
shiftSchema.methods.hasAvailablePosition = function() {
  return this.getAvailablePositions().length > 0;
};

// Add position
shiftSchema.methods.addPosition = async function() {
  this.positions.push({
    status: 'open'
  });
  return await this.save();
};

// Fill position
shiftSchema.methods.fillPosition = async function(professionalId, offerId) {
  const position = this.positions.find(p => p.status === 'open');
  if (position) {
    position.status = 'accepted';
    position.professionalId = professionalId;
    position.offerId = offerId;
    position.acceptanceDate = new Date();
    
    // Check if all positions filled
    if (this.getAvailablePositions().length === 0) {
      this.status = 'filled';
      this.timeToFill = Math.round((new Date() - this.postedDate) / (1000 * 60 * 60));
    }
    
    return await this.save();
  }
};

// Estimate pay
shiftSchema.methods.estimatePay = function() {
  let total = this.rate.hourly * this.duration;
  
  if (this.rate.overtime) total += this.rate.overtime;
  if (this.rate.bonus) total += this.rate.bonus;
  
  return {
    basePay: this.rate.hourly * this.duration,
    overtime: this.rate.overtime || 0,
    bonus: this.rate.bonus || 0,
    total: total
  };
};

// Get summary
shiftSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    title: this.title,
    role: this.role,
    date: this.shiftDate,
    time: `${this.startTime} - ${this.endTime}`,
    duration: this.duration,
    rate: this.rate.hourly,
    totalEarnings: this.totalEarnings,
    filledPositions: this.filledPositions,
    openPositions: this.openPositions,
    status: this.status,
    location: this.location.address
  };
};

module.exports = mongoose.model('Shift', shiftSchema);
