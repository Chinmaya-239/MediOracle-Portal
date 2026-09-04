const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const Shift = require('../models/Shift');
const Booking = require('../models/Booking');
const { protect, isFacilityStaff } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const offers = await Offer.find({ $or: [{ professionalId: req.user.profileId }, { facilityId: req.user.profileId }] })
      .sort({ offerDate: -1 });
    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', protect, isFacilityStaff, async (req, res) => {
  try {
    const { shiftId, professionalId, matchScore, matchReason } = req.body;
    const shift = await Shift.findById(shiftId);
    
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    
    const offer = await Offer.create({
      shiftId,
      professionalId,
      facilityId: req.user.profileId,
      matchScore,
      matchReason,
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      shiftDetails: {
        role: shift.role,
        date: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: shift.duration,
        rate: shift.rate.hourly,
        location: shift.location.address
      }
    });
    
    res.status(201).json({ success: true, message: 'Offer sent', data: offer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/accept', protect, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    
    await offer.accept();
    
    // Create booking
    const booking = await Booking.create({
      shiftId: offer.shiftId,
      professionalId: offer.professionalId,
      facilityId: offer.facilityId,
      offerId: offer._id,
      status: 'confirmed',
      bookingDate: new Date(),
      confirmationDate: new Date(),
      shiftDetails: offer.shiftDetails,
      paymentDetails: {
        hourlyRate: offer.shiftDetails.rate
      }
    });
    
    // Fill shift position
    const shift = await Shift.findById(offer.shiftId);
    await shift.fillPosition(offer.professionalId, offer._id);
    
    res.json({ success: true, message: 'Offer accepted', data: { offer, booking } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/reject', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    
    await offer.reject(reason);
    res.json({ success: true, message: 'Offer rejected', data: offer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
