require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');

const app = express();
const server = http.createServer(app);

// Integrate WebSockets
const io = new Server(server, {
    cors: { origin: '*' }
});
app.set('io', io); // Expose to routes

io.on('connection', (socket) => {
    console.log('✅ Real-time client connected via WebSocket');
    socket.on('disconnect', () => console.log('❌ Client disconnected'));
});

// Middleware
app.use(cors());
app.use(express.json());
// Serve local files as static cloud storage mock
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

app.get('/', (req, res) => res.send('API Running with Real-Time WebSockets 🚀'));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smarteventDB')
  .then(() => console.log('MongoDB Connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
