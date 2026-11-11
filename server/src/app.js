import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check route to test Express + PostgreSQL connection
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS current_time');
        res.status(200).json({
            status: 'ok',
            dbTime: result.rows[0].current_time,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
});

export default app;