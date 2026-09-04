const express = require('express');
const router = express.Router();
const Professional = require('../models/Professional');
const { protect, isProfessional, isAgencyAdmin } = require('../middleware/auth');

// =============== GET ALL PROFESSIONALS ===============
router.get('/', async (req, res) => {
  try {
    const { role, city, specialty, minRating } = req.query;
    const filter = { profileStatus: 'active' };
    
    if (role) filter.role = role;
    if (city) filter['address.city'] = city;
    if (specialty) filter.specialties = specialty;
    if (minRating) filter['performance.averageRating'] = { $gte: parseFloat(minRating) };
    
    const professionals = await Professional.find(filter)
      .limit(50)
      .sort({ 'performance.averageRating': -1 });
    
    res.json({
      success: true,
      count: professionals.length,
      data: professionals.map(p => ({
        _id: p._id,
        fullName: p.fullName,
        role: p.role,
        specialties: p.specialties,
        city: p.address?.city,
        averageRating: p.performance.averageRating,
        completedShifts: p.performance.totalShiftsCompleted,
        isVerified: p.isVerified
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET PROFESSIONAL PROFILE ===============
router.get('/:id', async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.id);
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    
    res.json({
      success: true,
      data: professional
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== UPDATE OWN PROFILE ===============
router.put('/profile/update', protect, isProfessional, async (req, res) => {
  try {
    const professional = await Professional.findById(req.user.profileId);
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }
    
    const { firstName, lastName, phone, role, specialties, address, bio, languages } = req.body;
    
    Object.assign(professional, {
      firstName: firstName || professional.firstName,
      lastName: lastName || professional.lastName,
      phone: phone || professional.phone,
      role: role || professional.role,
      specialties: specialties || professional.specialties,
      address: address || professional.address,
      bio: bio || professional.bio,
      languages: languages || professional.languages,
      updatedAt: new Date()
    });
    
    professional.calculateProfileCompletion();
    await professional.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: professional._id,
        fullName: professional.fullName,
        role: professional.role,
        profileCompletion: professional.profileCompletion,
        profileStatus: professional.profileStatus
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== UPDATE AVAILABILITY ===============
router.put('/:id/availability', protect, async (req, res) => {
  try {
    const { status, weeklySchedule, blackoutDates } = req.body;
    
    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      {
        'availability.status': status,
        'availability.weeklySchedule': weeklySchedule,
        'availability.blackoutDates': blackoutDates
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Availability updated',
      data: professional.availability
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== ADD CREDENTIAL ===============
router.post('/:id/credentials', protect, async (req, res) => {
  try {
    const { type, name, issuer, issueDate, expiryDate, licenseNumber, documentUrl } = req.body;
    
    const professional = await Professional.findById(req.params.id);
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    
    professional.credentials.push({
      type,
      name,
      issuer,
      issueDate,
      expiryDate,
      licenseNumber,
      documentUrl,
      verificationStatus: 'pending'
    });
    
    professional.calculateProfileCompletion();
    await professional.save();
    
    res.json({
      success: true,
      message: 'Credential added successfully',
      data: professional.credentials
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== UPDATE BANKING INFO ===============
router.put('/:id/banking', protect, async (req, res) => {
  try {
    const { accountHolderName, bankName, accountNumber, sortCode, iban } = req.body;
    
    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      {
        'banking.accountHolderName': accountHolderName,
        'banking.bankName': bankName,
        'banking.accountNumber': accountNumber,
        'banking.sortCode': sortCode,
        'banking.iban': iban
      },
      { new: true }
    );
    
    professional.calculateProfileCompletion();
    await professional.save();
    
    res.json({
      success: true,
      message: 'Banking information updated',
      data: {
        accountVerified: professional.banking.accountVerified
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== GET PERFORMANCE METRICS ===============
router.get('/:id/performance', async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.id);
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    
    res.json({
      success: true,
      data: professional.performance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET WORK HISTORY ===============
router.get('/:id/work-history', async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.id);
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    
    res.json({
      success: true,
      data: professional.workHistory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== ADD WORK EXPERIENCE ===============
router.post('/:id/work-history', protect, async (req, res) => {
  try {
    const { facilityName, role, startDate, endDate, reason } = req.body;
    
    const professional = await Professional.findById(req.params.id);
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    
    professional.workHistory.push({
      facilityName,
      role,
      startDate,
      endDate,
      reason
    });
    
    await professional.save();
    
    res.json({
      success: true,
      message: 'Work experience added',
      data: professional.workHistory
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== VERIFY PROFESSIONAL ===============
router.put('/:id/verify', protect, isAgencyAdmin, async (req, res) => {
  try {
    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      {
        isVerified: true,
        profileStatus: 'active',
        verificationDate: new Date()
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Professional verified successfully',
      data: {
        isVerified: professional.isVerified,
        profileStatus: professional.profileStatus
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
