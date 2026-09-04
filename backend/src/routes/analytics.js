const express = require('express');
const router = express.Router();
const Shift = require('../models/Shift');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Professional = require('../models/Professional');
const Facility = require('../models/Facility');
const { protect } = require('../middleware/auth');

// Facility Dashboard Analytics
router.get('/facility/:facilityId', protect, async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.facilityId);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    
    const shifts = await Shift.find({ facilityId: req.params.facilityId });
    const bookings = await Booking.find({ facilityId: req.params.facilityId });
    const payments = await Payment.find({ facilityId: req.params.facilityId });
    
    const totalShifts = shifts.length;
    const filledShifts = shifts.filter(s => s.isFilled).length;
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const noShows = bookings.filter(b => b.status === 'no_show').length;
    const totalSpent = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    
    const avgRating = bookings.length > 0 
      ? bookings.filter(b => b.rating?.score).reduce((sum, b) => sum + b.rating.score, 0) / bookings.filter(b => b.rating?.score).length
      : 0;
    
    res.json({
      success: true,
      data: {
        shiftMetrics: {
          totalPosted: totalShifts,
          totalFilled: filledShifts,
          fillRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0
        },
        bookingMetrics: {
          total: totalBookings,
          completed: completedBookings,
          noShows,
          noShowRate: totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0,
          completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0
        },
        financialMetrics: {
          totalSpent,
          averageShiftCost: totalShifts > 0 ? Math.round(totalSpent / totalShifts) : 0,
          budgetUtilization: facility.financials.totalBudgetYearly > 0 
            ? Math.round((totalSpent / facility.financials.totalBudgetYearly) * 100)
            : 0
        },
        qualityMetrics: {
          averageRating: Math.round(avgRating * 10) / 10,
          staffingStatus: facility.getStaffingStatus()
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Professional Dashboard Analytics
router.get('/professional/:professionalId', protect, async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.professionalId);
    if (!professional) return res.status(404).json({ error: 'Professional not found' });
    
    const bookings = await Booking.find({ professionalId: req.params.professionalId });
    const payments = await Payment.find({ professionalId: req.params.professionalId });
    
    const completedShifts = bookings.filter(b => b.status === 'completed').length;
    const cancelledShifts = bookings.filter(b => b.status === 'cancelled').length;
    const noShows = bookings.filter(b => b.status === 'no_show').length;
    const totalEarnings = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    
    const ratings = bookings.filter(b => b.rating?.score).map(b => b.rating.score);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    
    res.json({
      success: true,
      data: {
        performanceMetrics: {
          completedShifts,
          cancelledShifts,
          noShows,
          completionRate: completedShifts + cancelledShifts > 0 
            ? Math.round((completedShifts / (completedShifts + cancelledShifts)) * 100)
            : 0,
          reliability: 100 - (noShows > 0 ? Math.round((noShows / (completedShifts + noShows)) * 100) : 0)
        },
        earningsMetrics: {
          totalEarnings: Math.round(totalEarnings),
          totalHours: bookings.reduce((sum, b) => sum + (b.attendance.actualHoursWorked || 0), 0),
          averageHourlyRate: bookings.length > 0 
            ? Math.round(totalEarnings / bookings.reduce((sum, b) => sum + (b.attendance.actualHoursWorked || 1), 0))
            : 0,
          recentPayments: payments.slice(0, 5).map(p => ({
            amount: p.totalAmount,
            date: p.actualPaymentDate,
            status: p.status
          }))
        },
        qualityMetrics: {
          averageRating: Math.round(avgRating * 10) / 10,
          totalRatings: ratings.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System-wide Analytics
router.get('/', protect, async (req, res) => {
  try {
    const shifts = await Shift.find();
    const bookings = await Booking.find();
    const professionals = await Professional.find();
    const facilities = await Facility.find();
    const payments = await Payment.find();
    
    res.json({
      success: true,
      data: {
        platformMetrics: {
          totalFacilities: facilities.length,
          totalProfessionals: professionals.length,
          totalShiftsPosted: shifts.length,
          totalBookings: bookings.length,
          totalPayments: Math.round(payments.reduce((sum, p) => sum + p.totalAmount, 0))
        },
        trends: {
          shiftsThisMonth: shifts.filter(s => new Date(s.postedDate) > new Date(Date.now() - 30*24*60*60*1000)).length,
          bookingsThisMonth: bookings.filter(b => new Date(b.bookingDate) > new Date(Date.now() - 30*24*60*60*1000)).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
