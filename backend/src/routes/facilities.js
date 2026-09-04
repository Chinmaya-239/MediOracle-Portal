const express = require('express');
const router = express.Router();
const Facility = require('../models/Facility');
const { protect, authorize } = require('../middleware/auth');

// =============== GET ALL FACILITIES ===============
router.get('/', async (req, res) => {
  try {
    const { type, status, city } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (city) filter['address.city'] = city;
    
    const facilities = await Facility.find(filter)
      .limit(50)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: facilities.length,
      data: facilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET SINGLE FACILITY ===============
router.get('/:id', async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== CREATE FACILITY ===============
router.post('/', protect, authorize('facility_admin', 'agency_admin'), async (req, res) => {
  try {
    const { name, type, email, city, county, address, admin, contact } = req.body;
    
    const facility = await Facility.create({
      name,
      type,
      contact: {
        email,
        phone: contact?.phone,
        website: contact?.website
      },
      address: {
        street: address?.street,
        city,
        county,
        postalCode: address?.postalCode,
        country: 'Ireland'
      },
      admin: {
        name: admin?.name,
        email: admin?.email,
        phone: admin?.phone
      },
      status: 'pending_verification'
    });
    
    // Link user as facility admin
    if (req.user.role === 'facility_admin') {
      facility.admin = {
        name: req.user.firstName + ' ' + req.user.lastName,
        email: req.user.email,
        phone: req.user.phone
      };
      await facility.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: facility
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== UPDATE FACILITY ===============
router.put('/:id', protect, authorize('facility_admin', 'agency_admin'), async (req, res) => {
  try {
    const { name, type, contact, address, admin, departments } = req.body;
    
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        contact,
        address,
        admin,
        departments,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: facility
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== DELETE FACILITY ===============
router.delete('/:id', protect, authorize('agency_admin'), async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    res.json({
      success: true,
      message: 'Facility deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET STAFFING STATUS ===============
router.get('/:id/staffing-status', async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    const status = facility.getStaffingStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== GET DASHBOARD ANALYTICS ===============
router.get('/:id/analytics', protect, async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    res.json({
      success: true,
      data: {
        totalProfessionalsWorked: facility.statistics.totalProfessionalsWorked,
        totalShiftsPosted: facility.statistics.totalShiftsPosted,
        totalShiftsFilled: facility.statistics.totalShiftsFilled,
        fillRate: facility.statistics.fillRate,
        averageQualityRating: facility.statistics.averageQualityRating,
        staffingStatus: facility.getStaffingStatus(),
        yearlyBudget: facility.financials.totalBudgetYearly,
        yearlySpent: facility.financials.totalSpentYearly,
        budgetRemaining: facility.financials.totalBudgetYearly - facility.financials.totalSpentYearly
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== UPDATE COMPLIANCE REQUIREMENTS ===============
router.put('/:id/compliance', protect, authorize('facility_admin', 'agency_admin'), async (req, res) => {
  try {
    const { licenses, certifications, backgroundCheckRequired, immunizationsRequired, trainingRequired } = req.body;
    
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      {
        complianceRequirements: {
          licenses,
          certifications,
          backgroundCheckRequired,
          immunizationsRequired,
          trainingRequired
        }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Compliance requirements updated',
      data: facility.complianceRequirements
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =============== ADD DEPARTMENT ===============
router.post('/:id/departments', protect, authorize('facility_admin', 'agency_admin'), async (req, res) => {
  try {
    const { name, code, budget } = req.body;
    
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    facility.departments.push({
      name,
      code,
      budget: {
        monthly: budget,
        spent: 0,
        remaining: budget
      }
    });
    
    await facility.save();
    
    res.json({
      success: true,
      message: 'Department added successfully',
      data: facility.departments
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
