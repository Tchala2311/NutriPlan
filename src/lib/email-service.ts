/**
 * Email service abstraction.
 * Priority: RESEND_API_KEY → GMAIL_USER+GMAIL_APP_PASSWORD → mock (dev only).
 *
 * Gmail setup (no new account needed):
 *   1. Enable 2FA on your Google account
 *   2. myaccount.google.com/apppasswords → create app password (16 chars, no spaces)
 *   3. Add to .env.local:
 *        GMAIL_USER=youraddress@gmail.com
 *        GMAIL_APP_PASSWORD=abcdabcdabcdabcd
 */

export interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailResponse {
  success: boolean;
  id?: string;
  error?: string;
  provider?: string;
}

async function sendWithResend(options: EmailOptions): Promise<EmailResponse> {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: options.from || 'onboarding@resend.dev',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (result.error) {
    console.error('Resend error:', result.error);
    return { success: false, error: result.error.message };
  }
  return { success: true, id: result.data?.id, provider: 'resend' };
}

async function sendWithGmail(options: EmailOptions): Promise<EmailResponse> {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `NutriPlan <${process.env.GMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  return { success: true, id: info.messageId, provider: 'gmail' };
}

async function sendWithMock(options: EmailOptions): Promise<EmailResponse> {
  console.log('📧 [MOCK EMAIL]');
  console.log(`   From: ${options.from || 'noreply@nutriplan.app'}`);
  console.log(`   To: ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   HTML Length: ${options.html.length} chars`);
  const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`   ID: ${mockId}`);
  return { success: true, id: mockId, provider: 'mock' };
}

/**
 * Send email using the first configured provider.
 * Order: Resend → Gmail SMTP → mock
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  if (!options.to || !options.subject || !options.html) {
    return { success: false, error: 'Missing required fields: to, subject, html' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.to)) {
    return { success: false, error: 'Invalid email address format' };
  }

  try {
    if (process.env.RESEND_API_KEY) {
      return await sendWithResend(options);
    }
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return await sendWithGmail(options);
    }
    console.warn(
      '⚠️  No email provider configured (RESEND_API_KEY or GMAIL_USER+GMAIL_APP_PASSWORD). Using mock.'
    );
    return await sendWithMock(options);
  } catch (error) {
    console.error('Email service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function isUsingMockEmail(): boolean {
  return !process.env.RESEND_API_KEY && !(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}
