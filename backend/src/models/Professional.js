const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  
  // Professional Details
  role: {
    type: String,
    enum: ['nurse', 'hca', 'pharmacist', 'technician', 'midwife', 'allied_health'],
    required: true
  },
  specialties: [String], // e.g., ['ICU', 'Emergency', 'Pediatrics']
  
  // Location & Availability
  address: {
    street: String,
    city: String,
    county: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'unavailable', 'on_leave'],
      default: 'available'
    },
    weeklySchedule: {
      monday: {
        available: Boolean,
        shiftType: String // morning, afternoon, night, flexible
      },
      tuesday: {
        available: Boolean,
        shiftType: String
      },
      wednesday: {
        available: Boolean,
        shiftType: String
      },
      thursday: {
        available: Boolean,
        shiftType: String
      },
      friday: {
        available: Boolean,
        shiftType: String
      },
      saturday: {
        available: Boolean,
        shiftType: String
      },
      sunday: {
        available: Boolean,
        shiftType: String
      }
    },
    blackoutDates: [Date], // Dates not available
    preferredShiftLength: String, // '4', '8', '12', 'flexible'
    maxConsecutiveShifts: {
      type: Number,
      default: 5
    }
  },
  
  // Credentials & Licenses
  credentials: [{
    type: {
      type: String,
      enum: ['license', 'certification', 'training', 'immunization']
    },
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    licenseNumber: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'rejected'],
      default: 'pending'
    },
    verificationDate: Date,
    documentUrl: String
  }],
  
  // Verification Status
  nmbiLicense: {
    number: String,
    status: String,
    expiryDate: Date,
    verified: {
      type: Boolean,
      default: false
    }
  },
  gardaVetting: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvalDate: Date,
    expiryDate: Date
  },
  immunizations: [{
    type: String, // e.g., 'COVID-19', 'Flu', 'MMR'
    dateCompleted: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  
  // Work Experience
  workHistory: [{
    facilityName: String,
    facilityId: mongoose.Schema.Types.ObjectId,
    role: String,
    startDate: Date,
    endDate: Date,
    reason: String
  }],
  
  // Performance & Ratings
  performance: {
    totalShiftsCompleted: {
      type: Number,
      default: 0
    },
    totalShiftsCancelled: {
      type: Number,
      default: 0
    },
    noShowCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    competenceScore: {
      type: Number,
      default: 0
    },
    reliabilityScore: {
      type: Number,
      default: 0
    }
  },
  
  // Preferences & Settings
  preferences: {
    preferredFacilities: [mongoose.Schema.Types.ObjectId],
    preferredRoles: [String],
    minimumHourlyRate: {
      type: Number,
      default: 0
    },
    maximumTravelDistance: {
      type: Number,
      default: 50 // km
    },
    acceptedFacilities: [mongoose.Schema.Types.ObjectId],
    rejectedFacilities: [mongoose.Schema.Types.ObjectId],
    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: true
      },
      newShifts: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Financial
  banking: {
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    sortCode: String,
    iban: String,
    accountVerified: {
      type: Boolean,
      default: false
    }
  },
  taxInfo: {
    taxNumber: String,
    taxNumberVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Profile Status
  profileCompletion: {
    type: Number,
    default: 0 // percentage
  },
  profileStatus: {
    type: String,
    enum: ['incomplete', 'pending_verification', 'active', 'inactive', 'suspended'],
    default: 'incomplete'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  
  // Insurance
  professionalInsurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    coverageAmount: Number,
    documentUrl: String
  },
  
  // Additional Info
  languages: [String],
  bio: String,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
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
  collection: 'professionals'
});

// =============== INDEXES ===============
professionalSchema.index({ email: 1 });
professionalSchema.index({ phone: 1 });
professionalSchema.index({ role: 1 });
professionalSchema.index({ profileStatus: 1 });
professionalSchema.index({ 'address.coordinates': '2dsphere' });
professionalSchema.index({ isVerified: 1 });

// =============== VIRTUAL FIELDS ===============
professionalSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

professionalSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.county}`;
});

// =============== METHODS ===============
// Calculate profile completion percentage
professionalSchema.methods.calculateProfileCompletion = function() {
  const fields = [
    this.firstName,
    this.lastName,
    this.email,
    this.phone,
    this.role,
    this.address?.city,
    this.nmbiLicense?.number,
    this.credentials?.length > 0,
    this.banking?.accountNumber,
    this.professionalInsurance?.policyNumber
  ];
  
  const completed = fields.filter(f => f).length;
  this.profileCompletion = Math.round((completed / fields.length) * 100);
  return this.profileCompletion;
};

// Check if credentials are current
professionalSchema.methods.hasValidCredentials = function() {
  const now = new Date();
  return this.credentials.every(cred => {
    return cred.verificationStatus === 'verified' && (!cred.expiryDate || cred.expiryDate > now);
  });
};

// Check if available on specific date
professionalSchema.methods.isAvailableOn = function(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  return this.availability.weeklySchedule[dayName]?.available || false;
};

// Check if meets facility requirements
professionalSchema.methods.meetsFacilityRequirements = function(requirements) {
  if (!requirements) return true;
  
  const missing = [];
  
  if (requirements.nmbiLicense && !this.nmbiLicense?.verified) {
    missing.push('NMBI License');
  }
  
  if (requirements.gardaVetting && this.gardaVetting?.status !== 'approved') {
    missing.push('Garda Vetting');
  }
  
  if (requirements.immunizations?.length > 0) {
    const missing_immunizations = requirements.immunizations.filter(req => 
      !this.immunizations.some(i => i.type === req && i.dateCompleted)
    );
    if (missing_immunizations.length > 0) {
      missing.push(`Immunizations: ${missing_immunizations.join(', ')}`);
    }
  }
  
  return {
    meets: missing.length === 0,
    missing
  };
};

// Add work experience
professionalSchema.methods.addWorkExperience = async function(experience) {
  this.workHistory.push(experience);
  return await this.save();
};

// Update performance metrics
professionalSchema.methods.updatePerformanceMetrics = async function(data) {
  if (data.shiftCompleted) this.performance.totalShiftsCompleted += 1;
  if (data.shiftCancelled) this.performance.totalShiftsCancelled += 1;
  if (data.noShow) this.performance.noShowCount += 1;
  
  if (data.rating) {
    const total = this.performance.totalRatings + 1;
    this.performance.averageRating = (
      (this.performance.averageRating * this.performance.totalRatings + data.rating) / total
    );
    this.performance.totalRatings = total;
  }
  
  return await this.save();
};

module.exports = mongoose.model('Professional', professionalSchema);
