const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ $or: [{ professionalId: req.user.profileId }, { facilityId: req.user.profileId }] })
      .sort({ 'shiftDetails.date': -1 });
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/clock-in', protect, async (req, res) => {
  try {
    const { location } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    await booking.clockIn(location);
    res.json({ success: true, message: 'Clocked in', data: booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/clock-out', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    await booking.clockOut();
    res.json({ success: true, message: 'Clocked out', data: booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { score, feedback, competence, reliability, communication, teamwork, patientInteraction } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    await booking.addRating({
      score,
      feedback,
      competence,
      reliability,
      communication,
      teamwork,
      patientInteraction,
      ratedBy: req.user._id
    });
    
    res.json({ success: true, message: 'Rating submitted', data: booking.rating });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
