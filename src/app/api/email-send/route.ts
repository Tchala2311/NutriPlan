import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * POST /api/email-send
 * Send an email using Resend service
 * Body: {
 *   to: string (recipient email),
 *   subject: string,
 *   html: string (HTML content),
 *   from?: string (sender email, defaults to noreply@nutriplan.app)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Check API key first
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { to, subject, html, from = "noreply@nutriplan.app" } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Initialize Resend with API key
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("Email send error:", result.error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, id: result.data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
