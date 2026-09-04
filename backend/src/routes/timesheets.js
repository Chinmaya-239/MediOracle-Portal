const express = require('express');
const router = express.Router();
const Timesheet = require('../models/Timesheet');
const { protect, isFacilityStaff } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const timesheets = await Timesheet.find({ $or: [{ professionalId: req.user.profileId }, { facilityId: req.user.profileId }] })
      .sort({ date: -1 });
    res.json({ success: true, count: timesheets.length, data: timesheets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    res.json({ success: true, data: timesheet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, date } = req.body;
    const timesheet = await Timesheet.create({
      bookingId,
      date,
      professionalId: req.user.profileId,
      status: 'draft'
    });
    res.status(201).json({ success: true, message: 'Timesheet created', data: timesheet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/clock-in', protect, async (req, res) => {
  try {
    const { location } = req.body;
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    
    await timesheet.clockIn(location);
    res.json({ success: true, message: 'Clocked in', data: timesheet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/clock-out', protect, async (req, res) => {
  try {
    const { location } = req.body;
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    
    await timesheet.clockOut(location);
    res.json({ success: true, message: 'Clocked out', data: timesheet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/submit', protect, async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    
    await timesheet.submitForApproval();
    res.json({ success: true, message: 'Timesheet submitted', data: timesheet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/approve', protect, isFacilityStaff, async (req, res) => {
  try {
    const { notes } = req.body;
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    
    await timesheet.approve(req.user._id, notes);
    res.json({ success: true, message: 'Timesheet approved', data: timesheet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/reject', protect, isFacilityStaff, async (req, res) => {
  try {
    const { reason } = req.body;
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    
    await timesheet.reject(req.user._id, reason);
    res.json({ success: true, message: 'Timesheet rejected', data: timesheet });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
