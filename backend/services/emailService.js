const nodemailer = require('nodemailer');

// Create email transporter with Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

/**
 * Send password reset email with 6-digit code
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: email,
            subject: 'CricMate - Password Reset Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .code-box { background-color: #1e40af; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 5px; letter-spacing: 5px; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                        .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>CricMate</h1>
                            <p>Password Reset Request</p>
                        </div>
                        <div class="content">
                            <p>Hello ${userName || 'User'},</p>
                            <p>You requested to reset your password for your CricMate account.</p>
                            <p>Your password reset code is:</p>
                            <div class="code-box">${resetToken}</div>
                            <p><strong>This code will expire in 15 minutes.</strong></p>
                            <p>Enter this code on the password reset page to create a new password.</p>
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong><br>
                                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                            </div>
                        </div>
                        <div class="footer">
                            <p>This is an automated email from CricMate. Please do not reply to this email.</p>
                            <p>&copy; 2024 CricMate. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

/**
 * Test email configuration
 */
const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Email server is ready to send messages');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    testEmailConnection
};
