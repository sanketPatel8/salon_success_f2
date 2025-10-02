import { MailService } from '@sendgrid/mail';

// Use the SendGrid API key directly since environment variable isn't being set properly
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "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";

if (!SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY must be provided");
}

const mailService = new MailService();
mailService.setApiKey(SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
    }
    return false;
  }
}

export async function sendDeveloperNotification(
  userEmail: string,
  userName: string,
  businessType: string,
  signupType: 'registration' | 'promo_code' | 'subscription',
  additionalInfo?: string
): Promise<boolean> {
  const subject = `🚀 New User Joined Salon Success Manager - ${userName}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Alert - Salon Success Manager</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e91e63; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
            .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #e91e63; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New User Alert!</h1>
                <p>Someone just joined Salon Success Manager</p>
            </div>
            <div class="content">
                <div class="info-box">
                    <h3>👤 User Details</h3>
                    <p><strong>Name:</strong> ${userName}</p>
                    <p><strong>Email:</strong> ${userEmail}</p>
                    <p><strong>Business Type:</strong> ${businessType}</p>
                    <p><strong>Signup Type:</strong> ${signupType}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>
                    ${additionalInfo ? `<p><strong>Additional Info:</strong> ${additionalInfo}</p>` : ''}
                </div>
                
                <div class="info-box">
                    <h3>📊 Quick Actions</h3>
                    <p>• Check ActiveCampaign for contact details</p>
                    <p>• Monitor user onboarding progress</p>
                    <p>• Follow up if needed</p>
                </div>
            </div>
            <div class="footer">
                <p>Salon Success Manager - Developer Notification System</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: 'help@salonsuccessmanager.com', // Your developer email
    from: 'help@salonsuccessmanager.com',
    subject,
    html: htmlContent,
    text: `New user joined: ${userName} (${userEmail}) - Business: ${businessType} - Type: ${signupType}`
  });
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  baseUrl: string
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

  return await sendEmail({
    to: email,
    from: 'noreply@katiegodfrey.biz', // Using your verified sender email
    subject: 'Reset Your Password - Katie Godfrey Business Coach',
    text: textContent,
    html: htmlContent,
  });
}