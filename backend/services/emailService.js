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

/**
 * Send notification to admin when a parent registers
 */
const sendParentRegistrationNotification = async (parentUser) => {
    try {
        const transporter = createTransporter();
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: adminEmail,
            subject: 'CricMate - New Parent Registration Pending Approval',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .info-box { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #1e40af; }
                        .button { display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>CricMate</h1>
                            <p>New Parent Registration</p>
                        </div>
                        <div class="content">
                            <h2>Action Required: Parent Approval Pending</h2>
                            <p>A new parent has registered and is awaiting approval to access the system.</p>
                            
                            <div class="info-box">
                                <strong>Parent Details:</strong><br>
                                <strong>Name:</strong> ${parentUser.name}<br>
                                <strong>Email:</strong> ${parentUser.email}<br>
                                <strong>Phone:</strong> ${parentUser.phone || 'Not provided'}<br>
                                <strong>Registered:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}
                            </div>

                            <p>Please review and approve or reject this registration from your admin dashboard.</p>
                            
                            <p><strong>Note:</strong> The parent cannot access the system until approved.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from CricMate.</p>
                            <p>&copy; 2024 CricMate. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Parent registration notification sent to admin:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending parent registration notification:', error);
        // Don't throw - this shouldn't block registration
        return { success: false, error: error.message };
    }
};

/**
 * Send approval notification to parent
 */
const sendParentApprovalEmail = async (email, userName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: email,
            subject: 'CricMate - Your Account Has Been Approved! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
                        .button { display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                        .highlight { background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>CricMate</h1>
                            <p>Account Approved</p>
                        </div>
                        <div class="content">
                            <div class="success-icon">✅</div>
                            <h2 style="text-align: center; color: #10b981;">Welcome to CricMate!</h2>
                            
                            <p>Hello ${userName},</p>
                            
                            <p>Great news! Your CricMate parent account has been approved by our administration team.</p>
                            
                            <div class="highlight">
                                <strong>You can now access your account!</strong><br>
                                Log in to view your child's cricket journey, track their progress, attendance, payments, and communicate with coaches.
                            </div>

                            <p style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login to Your Account</a>
                            </p>

                            <p><strong>Next Steps:</strong></p>
                            <ul>
                                <li>Log in with your registered email and password</li>
                                <li>Link your child's profile using the invite code from their coach</li>
                                <li>Explore the dashboard and features</li>
                            </ul>

                            <p>If you have any questions, please don't hesitate to contact us.</p>
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
        console.log('Parent approval email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending parent approval email:', error);
        throw new Error('Failed to send approval email');
    }
};

/**
 * Send rejection notification to parent (optional)
 */
const sendParentRejectionEmail = async (email, userName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: email,
            subject: 'CricMate - Account Registration Update',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>CricMate</h1>
                            <p>Registration Update</p>
                        </div>
                        <div class="content">
                            <p>Hello ${userName},</p>
                            
                            <p>Thank you for your interest in CricMate.</p>
                            
                            <p>Unfortunately, we were unable to approve your parent account registration at this time.</p>
                            
                            <p>If you believe this is an error or have any questions, please contact our administration team for assistance.</p>
                            
                            <p>Contact: ${process.env.EMAIL_USER || 'cricmate.project@gmail.com'}</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2024 CricMate. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Parent rejection email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending parent rejection email:', error);
        // Don't throw - rejection can complete without email
        return { success: false, error: error.message };
    }
};

/**
 * Send payment reminder email (7 days before due date)
 */
const sendPaymentReminderEmail = async (email, recipientName, playerName, amount, dueDate) => {
    try {
        const transporter = createTransporter();
        const dueDateStr = new Date(dueDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: email,
            subject: `CricMate - Payment Reminder: LKR ${parseFloat(amount).toLocaleString()} due soon`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .amount-box { background-color: #fff; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; font-size: 20px; font-weight: bold; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏏 CricMate</h1>
                            <p>Payment Reminder</p>
                        </div>
                        <div class="content">
                            <p>Hello ${recipientName},</p>
                            <p>This is a friendly reminder that the monthly academy fee for <strong>${playerName}</strong> is due soon.</p>
                            <div class="amount-box">
                                Amount Due: LKR ${parseFloat(amount).toLocaleString()}<br>
                                <span style="font-size: 14px; font-weight: normal; color: #6b7280;">Due Date: ${dueDateStr}</span>
                            </div>
                            <p>Please ensure the payment is made <strong>before or on ${dueDateStr}</strong> to avoid late fees.</p>
                            <p>You can pay online through the CricMate portal or hand the payment physically to your coach.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated reminder from CricMate. Please do not reply to this email.</p>
                            <p>&copy; 2024 CricMate. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Payment reminder email sent to:', email, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending payment reminder email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send overdue payment notification email
 */
const sendPaymentOverdueEmail = async (email, recipientName, playerName, amount) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: email,
            subject: `⚠️ CricMate - Payment Overdue: LKR ${parseFloat(amount).toLocaleString()} for ${playerName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .overdue-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 20px 0; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏏 CricMate</h1>
                            <p>Payment Overdue</p>
                        </div>
                        <div class="content">
                            <p>Hello ${recipientName},</p>
                            <div class="overdue-box">
                                <strong>⚠️ OVERDUE NOTICE</strong><br>
                                The monthly academy fee of <strong>LKR ${parseFloat(amount).toLocaleString()}</strong> for <strong>${playerName}</strong> is now overdue.
                            </div>
                            <p>Please make the payment immediately through the CricMate portal or contact your coach to arrange physical payment.</p>
                            <p>If you have already made the payment, please ignore this notice or contact your coach to confirm.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated notice from CricMate. Contact: ${process.env.EMAIL_USER}</p>
                            <p>&copy; 2024 CricMate. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Payment overdue email sent to:', email, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending overdue email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send payment confirmation email
 */
const sendPaymentConfirmationEmail = async (email, recipientName, playerName, amount, method, transactionId) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'CricMate <noreply@cricmate.com>',
            to: email,
            subject: `✅ CricMate - Payment Confirmed: LKR ${parseFloat(amount).toLocaleString()}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .success-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏏 CricMate</h1>
                            <p>Payment Confirmation</p>
                        </div>
                        <div class="content">
                            <div style="text-align:center;font-size:48px;margin:10px 0">✅</div>
                            <h2 style="text-align:center;color:#10b981">Payment Successful!</h2>
                            <p>Hello ${recipientName}, your payment has been received. Here are the details:</p>
                            <div class="success-box">
                                <table style="width:100%;border-collapse:collapse">
                                    <tr><td style="padding:6px 0;color:#6b7280">Player</td><td style="padding:6px 0;font-weight:bold">${playerName}</td></tr>
                                    <tr><td style="padding:6px 0;color:#6b7280">Amount Paid</td><td style="padding:6px 0;font-weight:bold;color:#10b981">LKR ${parseFloat(amount).toLocaleString()}</td></tr>
                                    <tr><td style="padding:6px 0;color:#6b7280">Method</td><td style="padding:6px 0">${method}</td></tr>
                                    <tr><td style="padding:6px 0;color:#6b7280">Transaction ID</td><td style="padding:6px 0;font-size:12px;color:#6b7280">${transactionId}</td></tr>
                                    <tr><td style="padding:6px 0;color:#6b7280">Date</td><td style="padding:6px 0">${new Date().toLocaleDateString('en-LK')}</td></tr>
                                </table>
                            </div>
                            <p>Please keep this email as your payment receipt.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated confirmation from CricMate.</p>
                            <p>&copy; 2024 CricMate. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Payment confirmation email sent to:', email, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
    testEmailConnection,
    sendParentRegistrationNotification,
    sendParentApprovalEmail,
    sendParentRejectionEmail,
    sendPaymentReminderEmail,
    sendPaymentOverdueEmail,
    sendPaymentConfirmationEmail
};
