import { query } from '../config/db.js';
import { validateReadingInput } from '../utils/validators.js';

export const createReading = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reading_date, slot, value } = req.body;

        const validationError = validateReadingInput({ reading_date, slot, value });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const existingResult = await query(
            'SELECT id, slot FROM readings WHERE user_id = $1 AND reading_date = $2',
            [userId, reading_date]
        );
        const existingReadings = existingResult.rows;

        if (existingReadings.length >= 4) {
            return res.status(400).json({ error: 'You can add only 4 readings per day.' });
        }

        const duplicateSlot = existingReadings.find((r) => r.slot === slot);
        if (duplicateSlot) {
            return res.status(400).json({
                error: `You already have an ${slot} reading for this date.`,
            });
        }

        const insertResult = await query(
            `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, reading_date, slot, value, created_at`,
            [userId, reading_date, slot, Number(value)]
        );

        return res.status(201).json({
            reading: insertResult.rows[0],
        });
    } catch (error) {
        console.error('Create reading error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

export const getReadings = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;
        const { date } = req.query;

        let countQuery = 'SELECT COUNT(*)::int AS total FROM readings WHERE user_id = $1';
        let dataQuery = `
      SELECT id, reading_date, slot, value, created_at
      FROM readings
      WHERE user_id = $1
    `;
        const params = [userId];

        if (date) {
            countQuery += ' AND reading_date = $2';
            dataQuery += ' AND reading_date = $2';
            params.push(date);
        }

        dataQuery += ` ORDER BY reading_date DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

        const [countResult, dataResult] = await Promise.all([
            query(countQuery, params),
            query(dataQuery, [...params, limit, offset]),
        ]);

        const total = countResult.rows[0].total;

        return res.status(200).json({
            readings: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (error) {
        console.error('Get readings error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

export const updateReading = async (req, res) => {
    try {
        const userId = req.user.id;
        const readingId = Number(req.params.id);
        const { reading_date, slot, value } = req.body;

        const currentResult = await query(
            'SELECT id FROM readings WHERE id = $1 AND user_id = $2',
            [readingId, userId]
        );
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reading not found.' });
        }

        const validationError = validateReadingInput({ reading_date, slot, value });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const existingResult = await query(
            'SELECT id, slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND id != $3',
            [userId, reading_date, readingId]
        );
        const otherReadingsOnDate = existingResult.rows;

        if (otherReadingsOnDate.length >= 4) {
            return res.status(400).json({ error: 'You can add only 4 readings per day.' });
        }

        const duplicateSlot = otherReadingsOnDate.find((r) => r.slot === slot);
        if (duplicateSlot) {
            return res.status(400).json({
                error: `You already have an ${slot} reading for this date.`,
            });
        }

        const updateResult = await query(
            `UPDATE readings
       SET reading_date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, reading_date, slot, value, created_at`,
            [reading_date, slot, Number(value), readingId, userId]
        );

        return res.status(200).json({
            reading: updateResult.rows[0],
        });
    } catch (error) {
        console.error('Update reading error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

export const deleteReading = async (req, res) => {
    try {
        const userId = req.user.id;
        const readingId = Number(req.params.id);

        const deleteResult = await query(
            'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
            [readingId, userId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reading not found.' });
        }

        return res.status(200).json({ message: 'Reading deleted successfully.' });
    } catch (error) {
        console.error('Delete reading error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};