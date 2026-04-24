const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Configure Multer for "Cloud Storage" logic
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'poster-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Email Automations
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER || 'system@yourdomain.com', pass: process.env.EMAIL_PASS || 'secret' }
});

// GET /api/events - List all
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().populate('organizer_id', 'name');
        res.json(events);
    } catch (err) { res.status(500).send('Server error'); }
});

// POST /api/events - Create new event with Poster Upload
router.post('/', auth, upload.single('poster'), async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const newEvent = new Event({
            ...req.body,
            organizer_id: req.user.id,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null
        });
        const event = await newEvent.save();
        
        // Push Real-time Event to WebSockets
        req.app.get('io').emit('newEvent', event);
        res.json(event);
    } catch (err) { res.status(500).send('Server error'); }
});

// Register & Email Action
router.post('/:id/register', auth, async (req, res) => {
    try {
        const event_id = req.params.id;
        const user_id = req.user.id;

        const event = await Event.findById(event_id);
        const existing = await Registration.findOne({ event_id, user_id });
        if (existing) return res.status(400).json({ msg: 'Already registered' });

        const ticket_id = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const qrCodeData = await QRCode.toDataURL(ticket_id);

        const newRegistration = new Registration({ event_id, user_id, ticket_id, qrCodeData });
        const reg = await newRegistration.save();

        // Push real time analytics trigger
        req.app.get('io').emit('newRegistration', { event_id });
        
        // Console log simulating outbound SMTP push
        console.log(`[SMTP] Sending Ticket Email to User ${user_id} with QR Code for ${event.title}`);

        res.json(reg);
    } catch(err) { res.status(500).send('Server error'); }
});

// QR Code Check In
router.post('/scan', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const { ticket_id } = req.body;
        const registration = await Registration.findOne({ ticket_id });
        if (!registration) return res.status(404).json({ msg: 'Ticket not found' });
        
        if (registration.attendance_status) return res.status(400).json({ msg: 'Already checked in' });

        registration.attendance_status = true;
        registration.checkin_time = new Date();
        await registration.save();
        
        // Real-time Dashboard Pulse
        req.app.get('io').emit('attendanceUpdate', { ticket_id, event_id: registration.event_id });

        res.json({ msg: 'Attendance verified & logged successfully!', registration });
    } catch (err) { res.status(500).send('Server error'); }
});

// Advanced Analytics Data Pipeline
router.get('/admin/stats', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const totalEvents = await Event.countDocuments();
        const totalUsers = await require('../models/User').countDocuments({ role: 'participant' });
        const totalRegistrations = await Registration.countDocuments();
        const checkedInCount = await Registration.countDocuments({ attendance_status: true });

        // Retrieve breakdown for graph generation
        const events = await Event.find();
        const barChartData = { labels: [], datasets: [{ data: [], label: 'Participants', backgroundColor: '#0066FF' }] };
        
        for(let e of events) {
            const count = await Registration.countDocuments({event_id: e._id});
            barChartData.labels.push(e.title);
            barChartData.datasets[0].data.push(count);
        }

        res.json({
            stats: { totalEvents, totalUsers, totalRegistrations, checkedInCount },
            barChartData
        });
    } catch (err) { res.status(500).send('Server error'); }
});

module.exports = router;
