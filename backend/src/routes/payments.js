const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { protect, isAgencyAdmin } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ professionalId: req.user.profileId })
      .sort({ processedDate: -1 });
    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create', protect, isAgencyAdmin, async (req, res) => {
  try {
    const { professionalId, paymentPeriodStart, paymentPeriodEnd, bookingIds } = req.body;
    
    const bookings = await Booking.find({ _id: { $in: bookingIds } });
    
    let totalAmount = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let regularAmount = 0;
    let overtimeAmount = 0;
    
    bookings.forEach(booking => {
      const hours = booking.attendance.actualHoursWorked || 0;
      const rate = booking.paymentDetails.hourlyRate || 0;
      
      if (hours <= 8) {
        regularHours += hours;
        regularAmount += hours * rate;
      } else {
        regularHours += 8;
        overtimeHours += hours - 8;
        regularAmount += 8 * rate;
        overtimeAmount += (hours - 8) * (rate * 1.5);
      }
    });
    
    totalAmount = regularAmount + overtimeAmount;
    
    const payment = await Payment.create({
      paymentId: `PAY-${uuidv4().substring(0, 8)}`,
      professionalId,
      facilityId: bookings[0]?.facilityId,
      paymentPeriodStart,
      paymentPeriodEnd,
      breakDown: {
        regularHours: { hours: regularHours, rate: bookings[0]?.paymentDetails.hourlyRate || 0, amount: regularAmount },
        overtimeHours: { hours: overtimeHours, rate: (bookings[0]?.paymentDetails.hourlyRate || 0) * 1.5, amount: overtimeAmount },
        netAmount: totalAmount
      },
      totalAmount,
      lineItems: bookingIds.map(id => ({ bookingId: id }))
    });
    
    res.status(201).json({ success: true, message: 'Payment created', data: payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/approve', protect, isAgencyAdmin, async (req, res) => {
  try {
    const { notes } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    await payment.approve(req.user._id, 'finance', notes);
    res.json({ success: true, message: 'Payment approved', data: payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/schedule', protect, isAgencyAdmin, async (req, res) => {
  try {
    const { paymentDate } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    await payment.schedulePayment(new Date(paymentDate));
    res.json({ success: true, message: 'Payment scheduled', data: payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/process', protect, isAgencyAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    await payment.processPayment();
    res.json({ success: true, message: 'Payment processed', data: payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/mark-paid', protect, isAgencyAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    await payment.markAsPaid();
    res.json({ success: true, message: 'Payment marked as paid', data: payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
