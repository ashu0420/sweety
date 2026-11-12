import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool, { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatLocalDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function seed() {
    try {
        // 1. Ensure tables exist
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await query(schemaSql);

        // 2. Create or reset the demo user
        const demoEmail = 'demo@sweety.com';
        const demoPassword = 'password123';
        const passwordHash = await bcrypt.hash(demoPassword, 10);

        await query('DELETE FROM users WHERE email = $1', [demoEmail]);

        const userRes = await query(
            `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
            ['Demo Patient', demoEmail, passwordHash]
        );
        const userId = userRes.rows[0].id;

        const now = new Date();
        const todayStr = formatLocalDate(now);
        const slots = [
            'Morning (fasting)',
            'After breakfast',
            'After lunch',
            'After dinner',
        ];

        const sampleReadings = [
            // Today: 3 slots filled (leaves 'After dinner' free for live testing)
            { date: todayStr, slot: 'Morning (fasting)', value: 96 },
            { date: todayStr, slot: 'After breakfast', value: 134 },
            { date: todayStr, slot: 'After lunch', value: 142 },
        ];

        // Earlier this month (Month-to-date): 3 previous days * 4 slots = 12 readings
        const mtdValues = [
            [92, 128, 148, 118],
            [98, 131, 152, 124],
            [90, 122, 139, 115],
        ];
        for (let i = 0; i < mtdValues.length; i++) {
            const dayNum = Math.max(1, now.getDate() - (i + 1));
            const dStr = formatLocalDate(
                new Date(now.getFullYear(), now.getMonth(), dayNum)
            );
            slots.forEach((slot, sIdx) => {
                sampleReadings.push({
                    date: dStr,
                    slot,
                    value: mtdValues[i][sIdx],
                });
            });
        }

        // Previous month (Monthly report): 5 days * 4 slots = 20 readings
        const prevMonthDays = [3, 8, 14, 20, 26];
        const prevMonthValues = [
            [88, 130, 155, 120],
            [94, 138, 160, 128],
            [91, 125, 144, 119],
            [99, 142, 168, 133],
            [86, 127, 149, 121],
        ];
        prevMonthDays.forEach((day, dIdx) => {
            const dStr = formatLocalDate(
                new Date(now.getFullYear(), now.getMonth() - 1, day)
            );
            slots.forEach((slot, sIdx) => {
                sampleReadings.push({
                    date: dStr,
                    slot,
                    value: prevMonthValues[dIdx][sIdx],
                });
            });
        });

        let insertedCount = 0;
        for (const r of sampleReadings) {
            const res = await query(
                `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reading_date, slot) DO NOTHING`,
                [userId, r.date, r.slot, r.value]
            );
            insertedCount += res.rowCount;
        }

        console.log(`✅ Seed complete! Inserted ${insertedCount} sample readings.`);
        console.log('   Demo Email:    demo@sweety.com');
        console.log('   Demo Password: password123');
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seed();