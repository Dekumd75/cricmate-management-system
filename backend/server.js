require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const coachRoutes = require('./routes/coachRoutes');
const { startPaymentScheduler } = require('./services/paymentScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Add Helmet for security headers
app.use(helmet());

// Security: Rate limiting for authentication routes only (prevent brute-force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Security: Strict CORS configuration (allow common Vite ports)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(cors({
    origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/player', require('./routes/playerRoutes'));
app.use('/api/match', require('./routes/matchRoutes'));
app.use('/api/opponent', require('./routes/opponentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/session', require('./routes/sessionRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, 'build');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API route not found' });
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// Test Database Connection and Sync Models
sequelize.authenticate()
    .then(() => {
        console.log('Connected to Database');
        return sequelize.sync();
    })
    .then(() => {
        console.log('Database models synced');
        // Start payment scheduler after DB is ready
        startPaymentScheduler();
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

app.get('/', (req, res) => {
    res.send('CricMate API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
