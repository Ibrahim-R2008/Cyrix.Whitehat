# White Hat Platform Backend

A Node.js backend server for the White Hat Platform with real OTP email functionality.

## Features

- 🔐 **Real OTP Email Sending** - Sends actual emails via Gmail SMTP
- ⏱️ **Rate Limiting** - Prevents spam with 5 OTP requests per 15 minutes per IP
- 🛡️ **Security** - Helmet.js security headers, CORS protection
- 📧 **Professional Emails** - Beautiful HTML email templates
- ⚡ **Fast & Reliable** - Express.js with proper error handling
- 🔄 **Auto-cleanup** - Expired OTPs automatically removed

## Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Email
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Generate a new App Password for "Mail"
   - Copy the 16-character password

### 3. Create Environment File
```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=3001
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
```

### 4. Start the Server
```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Send OTP
```http
POST /api/send-otp
Content-Type: application/json

{
  "email": "user@gmail.com",
  "userType": "whitehat" | "client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

### Verify OTP
```http
POST /api/verify-otp
Content-Type: application/json

{
  "email": "user@gmail.com",
  "otp": "123456",
  "userType": "whitehat" | "client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Health Check
```http
GET /api/health
```

## Security Features

- **Rate Limiting**: 5 OTP requests per 15 minutes per IP
- **OTP Expiration**: 10 minutes expiry time
- **Attempt Limiting**: Max 3 verification attempts per OTP
- **Input Validation**: Email format and user type validation
- **CORS Protection**: Configured for specific origins
- **Security Headers**: Helmet.js protection

## Email Template

The system sends professional HTML emails with:
- White Hat Platform branding
- Clear OTP display
- Security instructions
- Expiration warnings
- Professional styling

## Production Deployment

For production deployment:

1. **Use Environment Variables** for all sensitive data
2. **Set up Redis** for OTP storage instead of in-memory
3. **Configure Proper CORS** origins for your domain
4. **Use HTTPS** for all communications
5. **Set up Monitoring** and logging
6. **Consider Email Service** like SendGrid for better deliverability

## Troubleshooting

### Email Not Sending
- Check Gmail App Password is correct
- Verify 2FA is enabled on Gmail
- Check firewall/antivirus blocking SMTP
- Ensure Gmail account is not locked

### CORS Errors
- Add your frontend URL to CORS origins in server.js
- Check protocol (http/https) matches

### Rate Limiting
- Wait 15 minutes if hitting rate limits
- Check IP address if using proxy/VPN

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the health endpoint: `http://localhost:3001/api/health`
4. Check Gmail account security settings
