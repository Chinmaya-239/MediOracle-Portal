const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Facility name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['hospital', 'nursing_home', 'clinic', 'home_care', 'rehabilitation', 'mental_health'],
    required: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  address: {
    street: String,
    city: String,
    county: String,
    country: {
      type: String,
      default: 'Ireland'
    },
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contact: {
    email: {
      type: String,
      required: true
    },
    phone: String,
    website: String
  },
  admin: {
    name: String,
    email: String,
    phone: String
  },
  departments: [{
    name: String,
    code: String,
    managerId: mongoose.Schema.Types.ObjectId,
    budget: {
      monthly: Number,
      spent: Number,
      remaining: Number
    },
    staffingRequirements: [{
      role: String,
      required: Number,
      confirmed: Number,
      pending: Number
    }]
  }],
  
  // Staffing Configuration
  staffingRules: {
    minimumStaffRatio: {
      nurses: Number,
      hcas: Number,
      othercategories: Number
    },
    maximumConsecutiveShifts: {
      type: Number,
      default: 5
    },
    minimumBreakBetweenShifts: {
      type: Number,
      default: 11, // hours
      description: 'Minimum hours between shift end and next shift start'
    },
    allowedRoles: [String],
    requiredCredentials: [String]
  },
  
  // Budget & Financial
  financials: {
    totalBudgetYearly: Number,
    totalSpentYearly: Number,
    averageHourlyRate: Number,
    paymentTermsDays: {
      type: Number,
      default: 30
    }
  },
  
  // Integration Settings
  integrations: {
    rostering_system: String,
    payroll_system: String,
    ehr_system: String,
    api_key: String
  },
  
  // Compliance & Credentials
  complianceRequirements: {
    licenses: [String],
    certifications: [String],
    backgroundCheckRequired: {
      type: Boolean,
      default: true
    },
    immunizationsRequired: [String],
    trainingRequired: [String]
  },
  
  // Statistics
  statistics: {
    totalProfessionalsWorked: {
      type: Number,
      default: 0
    },
    totalShiftsPosted: {
      type: Number,
      default: 0
    },
    totalShiftsFilled: {
      type: Number,
      default: 0
    },
    fillRate: {
      type: Number,
      default: 0
    },
    averageQualityRating: {
      type: Number,
      default: 0
    }
  },
  
  // Status & Settings
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  
  // Preferences
  preferences: {
    preferredCandidates: [mongoose.Schema.Types.ObjectId],
    blockedCandidates: [mongoose.Schema.Types.ObjectId],
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      },
      newApplications: {
        type: Boolean,
        default: true
      }
    }
  },
  
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
  collection: 'facilities'
});

// =============== INDEXES ===============
facilitySchema.index({ name: 1 });
facilitySchema.index({ type: 1 });
facilitySchema.index({ status: 1 });
facilitySchema.index({ 'address.city': 1 });
facilitySchema.index({ 'address.coordinates': '2dsphere' });
facilitySchema.index({ isVerified: 1 });

// =============== VIRTUAL FIELDS ===============
facilitySchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.county}, ${addr.postalCode}`;
});

// =============== METHODS ===============
// Update budget
facilitySchema.methods.updateBudget = async function(amount, type = 'spend') {
  if (type === 'spend') {
    this.financials.totalSpentYearly += amount;
    this.financials.totalSpentYearly = Math.max(0, this.financials.totalSpentYearly);
  }
  return await this.save();
};

// Calculate fill rate
facilitySchema.methods.calculateFillRate = async function() {
  if (this.statistics.totalShiftsPosted === 0) return 0;
  const rate = (this.statistics.totalShiftsFilled / this.statistics.totalShiftsPosted) * 100;
  this.statistics.fillRate = Math.round(rate);
  return await this.save();
};

// Get staffing status
facilitySchema.methods.getStaffingStatus = function() {
  const status = {};
  this.departments.forEach(dept => {
    const total = dept.staffingRequirements.reduce((sum, req) => sum + req.required, 0);
    const confirmed = dept.staffingRequirements.reduce((sum, req) => sum + req.confirmed, 0);
    const shortage = total - confirmed;
    
    status[dept.name] = {
      total,
      confirmed,
      shortage,
      status: shortage === 0 ? 'green' : shortage <= 2 ? 'yellow' : 'red'
    };
  });
  return status;
};

// Check if has capacity
facilitySchema.methods.hasCapacity = function(departmentId, requiredPositions = 1) {
  const dept = this.departments.find(d => d._id.toString() === departmentId.toString());
  if (!dept) return false;
  
  const totalRequired = dept.staffingRequirements.reduce((sum, r) => sum + r.required, 0);
  const totalConfirmed = dept.staffingRequirements.reduce((sum, r) => sum + r.confirmed, 0);
  
  return (totalRequired - totalConfirmed) >= requiredPositions;
};

module.exports = mongoose.model('Facility', facilitySchema);
