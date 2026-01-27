require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const coachRoutes = require('./routes/coachRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/player', require('./routes/playerRoutes'));

// Test Database Connection and Sync Models
sequelize.authenticate()
    .then(() => {
        console.log('Connected to Database');
        // Sync all models with database
        return sequelize.sync();
    })
    .then(() => {
        console.log('Database models synced');
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
