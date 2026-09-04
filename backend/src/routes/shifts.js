const express = require('express');
const router = express.Router();
const Shift = require('../models/Shift');
const Professional = require('../models/Professional');
const { protect, authorize, isFacilityStaff } = require('../middleware/auth');

// =============== GET ALL SHIFTS ===============
router.get('/', async (req, res) => {
  try {
    const { facilityId, role, status, minRate, specialty, city } = req.query;
    const filter = {};
    
    if (facilityId) filter.facilityId = facilityId;
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (minRate) filter['rate.hourly'] = { $gte: parseFloat(minRate) };
    if (specialty) filter.specialties = specialty;
    if (city) filter['location.address'] = { $regex: city, $options: 'i' };
    
    const shifts = await Shift.find(filter)
      .populate('facilityId', 'name address')
      .limit(100)
      .sort({ postedDate: -1 });
    
    res.json({
      success: true,
      count: shifts.length,
      data: shifts.map(s => ({
        _id: s._id,
        title: s.title,
        role: s.role,
        date: s.shiftDate,
        time: `${s.startTime} - ${s.endTime}`,
        duration: s.duration,
        rate: s.rate.hourly,
        totalEarnings: s.totalEarnings,
        facility: s.facilityId?.name,
        openPositions: s.openPositions,
        status: s.status,
        applicationCount: s.applicationCount
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET SINGLE SHIFT ===============
router.get('/:id', async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id)
      .populate('facilityId', 'name address contact');
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    shift.viewCount += 1;
    await shift.save();
    
    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== CREATE SHIFT ===============
router.post('/', protect, isFacilityStaff, async (req, res) => {
  try {
    const { title, role, shiftDate, startTime, endTime, positionsNeeded, rate, specialties } = req.body;
    
    const shift = await Shift.create({
      title,
      role,
      shiftDate,
      startTime,
      endTime,
      positionsNeeded,
      specialties,
      rate: {
        hourly: rate
      },
      facilityId: req.user.profileId,
      createdBy: req.user._id,
      status: 'draft'
    });
    
    // Create positions
    for (let i = 0; i < positionsNeeded; i++) {
      shift.positions.push({ status: 'open' });
    }
    
    await shift.save();
    
    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== POST SHIFT (PUBLISH) ===============
router.put('/:id/post', protect, isFacilityStaff, async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    shift.status = 'posted';
    shift.postedDate = new Date();
    await shift.save();
    
    res.json({
      success: true,
      message: 'Shift posted successfully',
      data: shift
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== UPDATE SHIFT ===============
router.put('/:id', protect, isFacilityStaff, async (req, res) => {
  try {
    const { title, rate, specialties, positionsNeeded } = req.body;
    
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      {
        title,
        'rate.hourly': rate,
        specialties,
        positionsNeeded,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: shift
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== CANCEL SHIFT ===============
router.put('/:id/cancel', protect, isFacilityStaff, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    shift.status = 'cancelled';
    shift.cancelledDate = new Date();
    shift.cancellationReason = reason;
    await shift.save();
    
    res.json({
      success: true,
      message: 'Shift cancelled',
      data: shift
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== DELETE SHIFT ===============
router.delete('/:id', protect, isFacilityStaff, async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    res.json({
      success: true,
      message: 'Shift deleted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET FACILITY SHIFTS ===============
router.get('/facility/:facilityId', async (req, res) => {
  try {
    const shifts = await Shift.find({ 
      facilityId: req.params.facilityId,
      status: { $in: ['posted', 'filled'] }
    })
    .sort({ shiftDate: 1 });
    
    res.json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET SHIFT MATCHES (AI MATCHING) ===============
router.get('/:id/matches', protect, async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    // Find eligible professionals
    const professionals = await Professional.find({
      role: shift.role,
      profileStatus: 'active',
      isVerified: true,
      'performance.averageRating': { $gte: 3.5 }
    });
    
    // Score professionals
    const matches = professionals.map(prof => {
      let score = 50;
      
      // Check role match
      if (prof.role === shift.role) score += 15;
      
      // Check specialties
      const matchingSpecialties = (prof.specialties || []).filter(s => 
        (shift.specialties || []).includes(s)
      ).length;
      score += matchingSpecialties * 5;
      
      // Rating bonus
      score += prof.performance.averageRating * 5;
      
      // Completion rate bonus
      if (prof.performance.totalShiftsCompleted > 0) {
        const completionRate = (prof.performance.totalShiftsCompleted / 
          (prof.performance.totalShiftsCompleted + prof.performance.totalShiftsCancelled || 1)) * 100;
        score += (completionRate / 100) * 10;
      }
      
      // Availability bonus
      if (prof.availability.status === 'available') score += 10;
      
      return {
        professionalId: prof._id,
        name: prof.fullName,
        role: prof.role,
        specialties: prof.specialties,
        rating: prof.performance.averageRating,
        completedShifts: prof.performance.totalShiftsCompleted,
        matchScore: Math.min(100, Math.round(score)),
        reasons: [
          prof.role === shift.role && 'Role match',
          prof.isVerified && 'Verified professional',
          prof.performance.averageRating >= 4 && 'Highly rated',
          matchingSpecialties > 0 && `${matchingSpecialties} specialty match(es)`
        ].filter(Boolean)
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
    
    res.json({
      success: true,
      count: matches.length,
      data: matches.slice(0, 10) // Top 10 matches
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== ESTIMATE SHIFT COST ===============
router.post('/:id/estimate-cost', protect, async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    const pay = shift.estimatePay();
    const totalCost = pay.total * shift.positionsNeeded;
    
    res.json({
      success: true,
      data: {
        costPerPosition: pay,
        totalForAllPositions: totalCost,
        budgetRemaining: 10000 - totalCost // Example budget
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
