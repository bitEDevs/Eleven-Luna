require('dotenv').config(); // Para mabasa ang .env file
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, JS, CSS) mula sa parehong folder
// Palitan ang app.use(express.static(__dirname)); nito:
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_long_random_string";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET || "6Lc61ZwtAAAAAMcm40rzPgRMNSaVg2y69a-YNbNP";

// ---- Helper: verifyRecaptcha ----
async function verifyRecaptcha(token) {
    try {
        const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
        });
        const data = await res.json();
        console.log('reCAPTCHA Response:', data);
        return data.success;
    } catch (err) {
        console.error('reCAPTCHA Error:', err);
        return false;
    }
}

// ---- Database Setup ----
const db = new Database('classroom.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )
`);

// ---- Seed Students ----
const students = [
    { username: "Darryl L. Barotilla", password: "darryl1" },
    { username: "Jay-el S. Buenconcijo", password: "jay-el2" },
    { username: "Jemwel A. Burac", password: "jemwel3" },
    { username: "Juan Miguel B. De Lara", password: "juan miguel4" },
    { username: "Rovic P. Gamboa", password: "rovic5" },
    { username: "Brent T. Gonzales", password: "brent6" },
    { username: "John Kelvin M. Librando", password: "john kelvin7" },
    { username: "Rhanz Ivan B. Octa", password: "rhanz ivan8" },
    { username: "Jonalyn D. Aboy", password: "jonalyn1" },
    { username: "Sarah G. Cadungog", password: "sarah2" },
    { username: "Xiaren Georgina R. Chuayap", password: "xiaren georgina3" },
    { username: "Merry Angel Lhynne R. Cortez", password: "merry angel lhynne4" },
    { username: "Ashley Nicolle G. Demitillo", password: "ashley nicolle5" },
    { username: "Nathalie N. Fetalino", password: "nathalie6" },
    { username: "Alexa Mae R. Gamboa", password: "alexa mae7" },
    { username: "Jenna E. Gonzales", password: "jenna8" },
    { username: "Justine Joyce M. Ignacio", password: "justine joyce9" },
    { username: "Jahnelle L. Lucreda", password: "jahnelle10" },
    { username: "Shenna P. Lucreda", password: "shenna11" },
    { username: "Lhorence Hanna R. Occiano", password: "lhorence hanna12" },
    { username: "Nizia Mae A. Precilla", password: "nizia mae13" },
    { username: "Princess Jandy E. Reyes", password: "princess jandy14" },
    { username: "Sunbeam Love Q. Sonalan", password: "sunbeam love15" }
];

async function seedStudents() {
    const insert = db.prepare('INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)');
    for (const s of students) {
        const hash = await bcrypt.hash(s.password, 10);
        const result = insert.run(s.username, hash);
        if (result.changes > 0) {
            console.log(`Seeded: ${s.username}`);
        }
    }
}

// ---- Auth Routes ----
app.post('/api/login', async (req, res) => {
    const { username, password, recaptchaResponse } = req.body;

    if (!username || !password || !recaptchaResponse) {
        return res.status(400).json({ success: false, message: "Missing fields." });
    }

    const captchaValid = await verifyRecaptcha(recaptchaResponse);
    if (!captchaValid) {
        return res.status(400).json({ success: false, message: "reCAPTCHA verification failed." });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username or passcode." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ success: false, message: "Invalid username or passcode." });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ success: true, token });
});

app.get('/api/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: "No token provided." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, username: decoded.username });
    } catch (err) {
        res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
});

// ---- Nodemailer OTP Routes ----
const otpStore = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,         // Tinanggal ang quotes
        pass: process.env.APP_PASSWORD   // Tinanggal ang quotes
    }
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Please supply a valid email.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(email, { otp, expiresAt });

    const mailOptions = {
        from: `"Verification" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Your One-Time Password (OTP)',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d0f1d; color: #ffffff; border-radius: 10px;">
                <h2 style="color: #d4af37;">Email Verification</h2>
                <p>Your 6-digit OTP code is:</p>
                <h1 style="color: #a78bfa; letter-spacing: 5px;">${otp}</h1>
                <p>OTP code will remain valid within 2 minutes. Do not share to others.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Success!' });
    } catch (error) {
        console.error('Email sent error:', error);
        res.status(500).json({ success: false, message: 'Error 1009' });
    }
});

//Error 203: Maling OTP code (Invalid OTP inserted by the user)  
//Error 101: Expired na ang OTP code (5 minutes limit exceeded)  
//Error 999: Walang nahanap na record ng OTP para sa email na iyon  
//Error 1009: Pumalya ang pagpapadala ng email/OTP sa transporter (Backend/Nodemailer error) 
//Error 204: Network o server connection error habang nagpapadala ng OTP (sendOTP catch block)
//Error 401: Network o server connection error habang nag-ve-verify ng OTP (verifyOTP catch block) 

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!otpStore.has(email)) {
        return res.status(400).json({ success: false, message: 'Error 999' });
    }

    const record = otpStore.get(email);

    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'Error 101' });
    }

    if (record.otp === otp) {
        otpStore.delete(email);
        return res.json({ success: true, message: 'Success!' });
    } else {
        // Binago mula 'INVALID OTP code' patungong 'Error 203'
        return res.status(400).json({ success: false, message: 'Error 203' });
    }
});

// ---- Start Server ----
seedStudents().then(() => {
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
});