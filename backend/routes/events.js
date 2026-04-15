const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');

// GET /api/events - List all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().populate('organizer_id', 'name');
        res.json(events);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// POST /api/events - Create new event (Organizer/Admin only)
router.post('/', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const newEvent = new Event({
            ...req.body,
            organizer_id: req.user.id
        });
        const event = await newEvent.save();
        res.json(event);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// GET /api/events/:id - Get Single Event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizer_id', 'name');
        if (!event) return res.status(404).json({ msg: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// POST /api/events/:id/register - Register for event
router.post('/:id/register', auth, async (req, res) => {
    try {
        const event_id = req.params.id;
        const user_id = req.user.id;

        const existing = await Registration.findOne({ event_id, user_id });
        if (existing) return res.status(400).json({ msg: 'Already registered' });

        const ticket_id = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const qrCodeData = await QRCode.toDataURL(ticket_id);

        const newRegistration = new Registration({
            event_id, user_id, ticket_id, qrCodeData
        });

        const reg = await newRegistration.save();
        res.json(reg);
    } catch(err) {
        res.status(500).send('Server error');
    }
});

// POST /api/events/scan - Scan QR to mark attendance
router.post('/scan', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const { ticket_id } = req.body;
        const registration = await Registration.findOne({ ticket_id });
        if (!registration) return res.status(404).json({ msg: 'Ticket not found' });
        
        if (registration.attendance_status) {
            return res.status(400).json({ msg: 'Already checked in' });
        }

        registration.attendance_status = true;
        registration.checkin_time = new Date();
        await registration.save();
        
        res.json({ msg: 'Attendance verified successfully', registration });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// GET /api/events/admin/stats - Get analytics dashboard stats
router.get('/admin/stats', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const totalEvents = await Event.countDocuments();
        const totalUsers = await require('../models/User').countDocuments({ role: 'participant' });
        const totalRegistrations = await Registration.countDocuments();
        const checkedInCount = await Registration.countDocuments({ attendance_status: true });

        res.json({
            totalEvents,
            totalUsers,
            totalRegistrations,
            checkedInCount
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
