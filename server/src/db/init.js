import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

// In ES Modules ("type": "module"), __dirname is not global, so we derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(sql);
        console.log('✅ Database tables initialized successfully.');
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        process.exit(1);
    } finally {
        await pool.end(); // Close the connection pool so the script exits cleanly
    }
}

initDb();