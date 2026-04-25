const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    venue: { type: String, required: true },
    organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String }, // Now storing Base64 directly
    detailsFileUrl: { type: String }, // Base64 for optional PDF/Doc
    detailsFileName: { type: String } // Original file name
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
