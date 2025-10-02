import nodemailer from 'nodemailer';

interface IonosConfig {
  email: string;
  password: string;
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendPasswordResetEmailViaIonos(
  email: string,
  resetToken: string,
  baseUrl: string,
  ionosConfig: IonosConfig
): Promise<boolean> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - Katie Godfrey Business Coach</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Katie Godfrey</h1>
        <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Business Coach</p>
      </div>
      
      <!-- Main Content -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Hello,
        </p>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          We received a request to reset your password for your Salon Growth Manager account. Click the button below to create a new password:
        </p>
        
        <!-- Reset Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Reset Password</a>
        </div>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        
        <p style="margin: 0 0 20px 0; font-size: 14px; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
          ${resetLink}
        </p>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #7f8c8d;">
          Best regards,<br>
          Katie Godfrey Business Coach
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Password Reset Request

Hello,

We received a request to reset your password for your Salon Growth Manager account.

To reset your password, please visit this link:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

---
Best regards,
Katie Godfrey Business Coach
  `;

  try {
    // Create transporter for Ionos email
    const transporter = nodemailer.createTransport({
      host: 'smtp.ionos.co.uk',
      port: 587,
      secure: false,
      auth: {
        user: ionosConfig.email,
        pass: ionosConfig.password
      }
    });

    // Send email
    await transporter.sendMail({
      from: `"Katie Godfrey Business Coach" <${ionosConfig.email}>`,
      to: email,
      subject: 'Reset Your Password - Salon Growth Manager',
      text: textContent,
      html: htmlContent
    });

    console.log(`✓ Password reset email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Ionos SMTP email error:', error);
    return false;
  }
}

export async function sendEmail(params: EmailParams, ionosConfig: IonosConfig): Promise<boolean> {
  try {
    // Create transporter for Ionos email
    const transporter = nodemailer.createTransport({
      host: 'smtp.ionos.co.uk',
      port: 587,
      secure: false,
      auth: {
        user: ionosConfig.email,
        pass: ionosConfig.password
      }
    });

    await transporter.sendMail({
      from: `"Katie Godfrey Business Coach" <${ionosConfig.email}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    });

    return true;
  } catch (error) {
    console.error('Ionos email error:', error);
    return false;
  }
}