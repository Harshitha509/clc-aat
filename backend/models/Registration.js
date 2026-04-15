const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticket_id: { type: String, required: true, unique: true },
    qrCodeData: { type: String, required: true },
    attendance_status: { type: Boolean, default: false },
    checkin_time: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
