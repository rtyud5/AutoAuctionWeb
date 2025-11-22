import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '7d';
const COOKIE_NAME = 'token';

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const [[existing]] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())', [
      name,
      email,
      hash,
      'user'
    ]);

    const userId = result.insertId;
    return res.status(201).json({ success: true, data: { id: userId, name, email } });
  } catch (err) {
    console.error('auth.register', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });

    const [[user]] = await db.query('SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    const secure = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });

    return res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('auth.login', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
    return res.json({ success: true });
  } catch (err) {
    console.error('auth.logout', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  register,
  login,
  logout
};