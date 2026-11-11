import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !name.trim() || !email || !email.trim() || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Hash password with bcrypt (10 salt rounds)
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user and return safe fields (never return password_hash!)
        const result = await query(
            `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
            [trimmedName, normalizedEmail, passwordHash]
        );

        return res.status(201).json({
            message: 'Registration successful. Please log in.',
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await query(
            'SELECT id, name, email, password_hash FROM users WHERE email = $1',
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};