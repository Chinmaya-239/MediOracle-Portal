const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Professional = require('../models/Professional');
const { protect, isFacilityStaff } = require('../middleware/auth');

router.post('/', protect, isFacilityStaff, async (req, res) => {
  try {
    const { bookingId, score, competence, reliability, communication, teamwork, patientInteraction, feedback } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    await booking.addRating({
      score,
      competence,
      reliability,
      communication,
      teamwork,
      patientInteraction,
      feedback,
      ratedBy: req.user._id
    });
    
    // Update professional metrics
    const professional = await Professional.findById(booking.professionalId);
    await professional.updatePerformanceMetrics({ rating: score });
    
    res.json({ success: true, message: 'Rating submitted', data: booking.rating });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/professional/:professionalId', async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      professionalId: req.params.professionalId,
      'rating.score': { $exists: true }
    }).sort({ 'rating.ratedAt': -1 });
    
    const ratings = bookings.map(b => b.rating);
    const avgScore = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
    
    res.json({
      success: true,
      count: ratings.length,
      averageScore: Math.round(avgScore * 10) / 10,
      data: ratings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
