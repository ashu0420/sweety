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
        // 1. Ensure tables exist first
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

        // 3. Build dynamic dates relative to today so Daily, MTD, and Previous Month all have data
        const now = new Date();
        const todayStr = formatLocalDate(now);

        const mtdDay1 = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const mtdDay2 = formatLocalDate(
            new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 1))
        );

        const prevMonth1 = formatLocalDate(
            new Date(now.getFullYear(), now.getMonth() - 1, 5)
        );
        const prevMonth2 = formatLocalDate(
            new Date(now.getFullYear(), now.getMonth() - 1, 15)
        );
        const prevMonth3 = formatLocalDate(
            new Date(now.getFullYear(), now.getMonth() - 1, 24)
        );

        const sampleReadings = [
            // Today's readings (3 slots filled, leaving 'After dinner' open for live testing!)
            { date: todayStr, slot: 'Morning (fasting)', value: 96 },
            { date: todayStr, slot: 'After breakfast', value: 134 },
            { date: todayStr, slot: 'After lunch', value: 142 },

            // Earlier this month (Month-to-date)
            { date: mtdDay1, slot: 'Morning (fasting)', value: 92 },
            { date: mtdDay1, slot: 'After breakfast', value: 128 },
            { date: mtdDay1, slot: 'After lunch', value: 148 },
            { date: mtdDay1, slot: 'After dinner', value: 118 },
            { date: mtdDay2, slot: 'Morning (fasting)', value: 98 },
            { date: mtdDay2, slot: 'After dinner', value: 126 },

            // Previous month (Monthly report)
            { date: prevMonth1, slot: 'Morning (fasting)', value: 88 },
            { date: prevMonth1, slot: 'After lunch', value: 155 },
            { date: prevMonth2, slot: 'Morning (fasting)', value: 94 },
            { date: prevMonth2, slot: 'After breakfast', value: 138 },
            { date: prevMonth2, slot: 'After dinner', value: 130 },
            { date: prevMonth3, slot: 'After lunch', value: 162 },
        ];

        for (const r of sampleReadings) {
            await query(
                `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reading_date, slot) DO NOTHING`,
                [userId, r.date, r.slot, r.value]
            );
        }

        console.log('✅ Seed complete!');
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