/**
 * Email service abstraction
 * Supports both Resend (production) and mock (development)
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
}

async function sendWithResend(
  options: EmailOptions
): Promise<EmailResponse> {
  const { Resend } = await import("resend");

  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: options.from || "noreply@nutriplan.app",
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (result.error) {
    console.error("Resend error:", result.error);
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    id: result.data?.id,
  };
}

async function sendWithMock(
  options: EmailOptions
): Promise<EmailResponse> {
  // Log to console for development
  console.log("📧 [MOCK EMAIL]");
  console.log(`   From: ${options.from || "noreply@nutriplan.app"}`);
  console.log(`   To: ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   HTML Length: ${options.html.length} chars`);

  // Generate a fake message ID
  const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // In development, also write to a log file if needed
  if (process.env.NODE_ENV === "development") {
    console.log(`   ID: ${mockId}`);
  }

  return {
    success: true,
    id: mockId,
  };
}

/**
 * Send email using configured service (Resend or mock)
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  // Validate input
  if (!options.to || !options.subject || !options.html) {
    return {
      success: false,
      error: "Missing required fields: to, subject, html",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.to)) {
    return {
      success: false,
      error: "Invalid email address format",
    };
  }

  try {
    // Use Resend if API key is configured, otherwise use mock
    if (process.env.RESEND_API_KEY) {
      return await sendWithResend(options);
    } else {
      console.warn(
        "⚠️  RESEND_API_KEY not configured. Using mock email service for development."
      );
      return await sendWithMock(options);
    }
  } catch (error) {
    console.error("Email service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if using real or mock email service
 */
export function isUsingMockEmail(): boolean {
  return !process.env.RESEND_API_KEY;
}
