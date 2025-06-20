import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    // Check if email configuration is provided
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailHost || !emailUser || !emailPass) {
      console.warn('Email service not configured. OTP emails will be logged to console.');
      this.isConfigured = false;
      return;
    }

    const config: EmailConfig = {
      host: emailHost,
      port: parseInt(emailPort || '587'),
      secure: emailPort === '465', // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };

    this.transporter = nodemailer.createTransport(config);
    this.isConfigured = true;

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
        this.isConfigured = false;
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  }

  async sendOTP(email: string, otpCode: string, tokenId: string): Promise<boolean> {
    const subject = 'Vmake Catalog - Access Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4AF37; margin: 0;">Vmake Finessee</h1>
          <p style="color: #666; margin: 5px 0;">Product Catalog Access</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
          <div style="background: #fff; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #D4AF37; letter-spacing: 4px;">${otpCode}</span>
          </div>
          <p style="color: #666; margin: 15px 0;">
            Enter this code to access your personalized product catalog.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 20px;">
            This code will expire in 10 minutes and can only be used once.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 20px;">
            NOTE : This link will will get bound on the device on which it has first opened. So open on the device which you can access everytime accessing the catalog. 
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>
    `;

    if (!this.isConfigured) {
      // Log to console for development/testing
      console.log(`
=== EMAIL OTP (Development Mode) ===
To: ${email}
Subject: ${subject}
OTP Code: ${otpCode}
Token ID: ${tokenId}
===================================
      `);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Vmake Finessee" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });

      console.log('OTP email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return false;
    }
  }

  async sendTokenLink(email: string, tokenLink: string): Promise<boolean> {
    const subject = 'Vmake Catalog - Your Personal Access Link';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4AF37; margin: 0;">VMake Finessee</h1>
          <p style="color: #666; margin: 5px 0;">Product Catalog Access</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Personal Catalog Access</h2>
          <p style="color: #666; margin-bottom: 25px;">
            Click the button below to access your personalized VMake product catalog:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${tokenLink}" 
               style="background: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Access Catalog
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 25px;">
            <strong>Important:</strong> This link is unique to you and will be bound to your device for security.
            NOTE : This link will will get bound on the device on which it has first opened. So open on the device which you can access everytime accessing the catalog. 
            You may need to complete your profile before accessing the catalog.
          </p>
          
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${tokenLink}</span>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this access, please ignore this email.
          </p>
        </div>
      </div>
    `;

    if (!this.isConfigured) {
      // Log to console for development/testing
      console.log(`
=== TOKEN LINK EMAIL (Development Mode) ===
To: ${email}
Subject: ${subject}
Token Link: ${tokenLink}
==========================================
      `);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"VMake Finessee" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });

      console.log('Token link email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send token link email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
