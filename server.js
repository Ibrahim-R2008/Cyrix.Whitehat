const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://127.0.0.1:8000', 'http://localhost:8000', 'file://'], // Add your frontend URLs
    credentials: true
}));
app.use(express.json());

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 OTP requests per windowMs
    message: {
        error: 'Too many OTP requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map();

// Email transporter setup
const createTransporter = () => {
    // Gmail configuration (you can change this to other providers)
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your Gmail address
            pass: process.env.EMAIL_PASS  // Your Gmail App Password
        }
    });
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    return emailRegex.test(email);
};

// Send OTP email
const sendOTPEmail = async (email, otp, userType) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: {
            name: 'White Hat Platform',
            address: process.env.EMAIL_USER
        },
        to: email,
        subject: '🛡️ White Hat Platform - Email Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea; margin-bottom: 10px;">🛡️ White Hat Platform</h1>
                    <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                        Hello! You're signing up as a <strong>${userType === 'client' ? 'Client' : 'White Hat Hacker'}</strong> on our platform.
                    </p>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                        Please use the following verification code to complete your registration:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                            ${otp}
                        </div>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                        <strong>Important:</strong>
                    </p>
                    <ul style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                        <li>This code will expire in 10 minutes</li>
                        <li>Do not share this code with anyone</li>
                        <li>If you didn't request this code, please ignore this email</li>
                    </ul>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            White Hat Platform - Secure Cybersecurity Services<br>
                            This is an automated message, please do not reply.
                        </p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent successfully to ${email}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error);
        throw new Error('Failed to send email');
    }
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'White Hat Platform Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Send OTP endpoint
app.post('/api/send-otp', otpLimiter, async (req, res) => {
    try {
        const { email, userType } = req.body;

        // Validate input
        if (!email || !userType) {
            return res.status(400).json({
                success: false,
                error: 'Email and userType are required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid Gmail address'
            });
        }

        if (!['whitehat', 'client'].includes(userType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpKey = `${email}_${userType}`;
        
        // Store OTP with expiration (10 minutes)
        otpStore.set(otpKey, {
            otp,
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
            attempts: 0
        });

        // Send email
        await sendOTPEmail(email, otp, userType);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            expiresIn: 600 // 10 minutes in seconds
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send OTP. Please try again.'
        });
    }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp, userType } = req.body;

        // Validate input
        if (!email || !otp || !userType) {
            return res.status(400).json({
                success: false,
                error: 'Email, OTP, and userType are required'
            });
        }

        const otpKey = `${email}_${userType}`;
        const storedOtpData = otpStore.get(otpKey);

        if (!storedOtpData) {
            return res.status(400).json({
                success: false,
                error: 'OTP not found or expired. Please request a new one.'
            });
        }

        // Check expiration
        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(otpKey);
            return res.status(400).json({
                success: false,
                error: 'OTP has expired. Please request a new one.'
            });
        }

        // Check attempts (max 3 attempts)
        if (storedOtpData.attempts >= 3) {
            otpStore.delete(otpKey);
            return res.status(400).json({
                success: false,
                error: 'Too many failed attempts. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (storedOtpData.otp !== otp) {
            storedOtpData.attempts++;
            otpStore.set(otpKey, storedOtpData);
            
            return res.status(400).json({
                success: false,
                error: `Invalid OTP. ${3 - storedOtpData.attempts} attempts remaining.`
            });
        }

        // OTP is valid - remove from store
        otpStore.delete(otpKey);

        res.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify OTP. Please try again.'
        });
    }
});

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 White Hat Platform Backend running on port ${PORT}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
