import nodemailer from 'nodemailer';

interface GmailConfig {
  email: string;
  password: string;
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendPasswordResetEmailViaGmail(
  recipientEmail: string, 
  resetToken: string, 
  baseUrl: string,
  gmailConfig: GmailConfig
): Promise<boolean> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Katie Godfrey Business Coach</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #f1f3f4;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #d946ef;
                margin-bottom: 10px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }
            .warning {
                background-color: #fef3cd;
                border: 1px solid #fde68a;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                color: #92400e;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Katie Godfrey Business Coach</div>
                <h1 style="margin: 0; color: #1f2937;">Reset Your Password</h1>
            </div>
            
            <p>Hello,</p>
            
            <p>You recently requested to reset your password for your Salon Growth Manager account. Click the button below to reset it:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset My Password</a>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you don't reset your password within this time, you'll need to request a new reset link.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetLink}
            </p>
            
            <p><strong>If you didn't request this password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
            
            <div class="footer">
                <p>This email was sent by Katie Godfrey Business Coach<br>
                Need help? Contact support at <a href="mailto:support@katiegodfrey.com">support@katiegodfrey.com</a></p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
Reset Your Password - Katie Godfrey Business Coach

Hello,

You recently requested to reset your password for your Salon Growth Manager account.

To reset your password, click this link or copy it into your browser:
${resetLink}

IMPORTANT: This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Need help? Contact support at support@katiegodfrey.com

---
Katie Godfrey Business Coach
  `;

  try {
    // Create transporter for Ionos email
    const transporter = nodemailer.createTransport({
      host: 'smtp.ionos.co.uk',
      port: 587,
      secure: false,
      auth: {
        user: gmailConfig.email,
        pass: gmailConfig.password
      }
    });

    // Send email
    await transporter.sendMail({
      from: `"Katie Godfrey Business Coach" <${gmailConfig.email}>`,
      to: recipientEmail,
      subject: 'Reset Your Password - Katie Godfrey Business Coach',
      text: textContent,
      html: htmlContent,
    });

    console.log(`Password reset email sent successfully to: ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Gmail SMTP email error:', error);
    return false;
  }
}