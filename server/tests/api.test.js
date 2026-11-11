import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool, { query } from '../src/config/db.js';

describe('Sweety API Integration Tests (Auth, Readings Rules 3 & 4, Reports)', () => {
    const testEmail = 'vitest_runner@sweety.local';
    let token = '';

    beforeAll(async () => {
        // Clean up any leftover test user from previous runs
        await query('DELETE FROM users WHERE email = $1', [testEmail]);

        // 1. Register test user
        const regRes = await request(app).post('/api/auth/register').send({
            name: 'Test Runner',
            email: testEmail,
            password: 'password123',
        });
        expect(regRes.status).toBe(201);

        // 2. Log in to obtain JWT
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testEmail,
            password: 'password123',
        });
        expect(loginRes.status).toBe(200);
        token = loginRes.body.token;
    });

    afterAll(async () => {
        // ON DELETE CASCADE automatically removes the test user's readings
        await query('DELETE FROM users WHERE email = $1', [testEmail]);
        await pool.end();
    });

    it('blocks unauthenticated requests with 401', async () => {
        const res = await request(app).get('/api/readings');
        expect(res.status).toBe(401);
    });

    it('enforces Rule 3 (unique slot per day) and Rule 4 (max 4 readings per day)', async () => {
        const testDate = '2026-10-15';

        // Add 1st reading: After lunch (140)
        const r1 = await request(app)
            .post('/api/readings')
            .set('Authorization', `Bearer ${token}`)
            .send({ reading_date: testDate, slot: 'After lunch', value: 140 });
        expect(r1.status).toBe(201);

        // Rule 3: Try adding a duplicate "After lunch" on the same date
        const dup = await request(app)
            .post('/api/readings')
            .set('Authorization', `Bearer ${token}`)
            .send({ reading_date: testDate, slot: 'After lunch', value: 160 });
        expect(dup.status).toBe(400);
        expect(dup.body.error).toBe(
            'You already have an After lunch reading for this date.'
        );

        // Fill the remaining 3 slots for that date (total = 4 readings)
        await request(app)
            .post('/api/readings')
            .set('Authorization', `Bearer ${token}`)
            .send({ reading_date: testDate, slot: 'Morning (fasting)', value: 90 });
        await request(app)
            .post('/api/readings')
            .set('Authorization', `Bearer ${token}`)
            .send({ reading_date: testDate, slot: 'After breakfast', value: 130 });
        await request(app)
            .post('/api/readings')
            .set('Authorization', `Bearer ${token}`)
            .send({ reading_date: testDate, slot: 'After dinner', value: 120 });

        // Rule 4: Try adding a 5th reading on the same date
        const fifth = await request(app)
            .post('/api/readings')
            .set('Authorization', `Bearer ${token}`)
            .send({ reading_date: testDate, slot: 'After lunch', value: 115 });
        expect(fifth.status).toBe(400);
        expect(fifth.body.error).toBe('You can add only 4 readings per day.');
    });

    it('computes Daily report highest, lowest, average, and chronological slot order', async () => {
        const res = await request(app)
            .get('/api/reports?date=2026-10-15')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        // Readings added above: 90, 130, 140, 120 -> sum = 480 -> avg = 120
        expect(res.body.daily.count).toBe(4);
        expect(res.body.daily.lowest).toBe(90);
        expect(res.body.daily.highest).toBe(140);
        expect(res.body.daily.average).toBe(120);

        // Check chronological slot ordering
        const slots = res.body.daily.readings.map((r) => r.slot);
        expect(slots).toEqual([
            'Morning (fasting)',
            'After breakfast',
            'After lunch',
            'After dinner',
        ]);
    });
});