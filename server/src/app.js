import express from 'express';
import cors from 'cors';
import pool from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import readingsRoutes from './routes/readings.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS current_time');
        res.status(200).json({ status: 'ok', dbTime: result.rows[0].current_time });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Readings routes
app.use('/api/readings', readingsRoutes);
app.use('/readings', readingsRoutes);

// Reports routes
app.use('/api/reports', reportsRoutes);
app.use('/reports', reportsRoutes);

export default app;