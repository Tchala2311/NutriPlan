import { NextRequest, NextResponse } from "next/server";
import { WORKFLOW_DOC_HTML } from "@/lib/workflow-doc";
import { Resend } from "resend";

/**
 * POST /api/email-send/workflow-doc
 * Send the workflow documentation to a specified email
 * Body: {
 *   to: string (recipient email, optional - defaults to process.env.WORKFLOW_DOC_RECIPIENT)
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
    const to = body.to || process.env.WORKFLOW_DOC_RECIPIENT || "tsem7354@gmail.com";

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
      from: "noreply@nutriplan.app",
      to,
      subject: "NutriPlan Development Workflow Documentation",
      html: WORKFLOW_DOC_HTML,
    });

    if (result.error) {
      console.error("Email send error:", result.error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: result.data?.id,
        message: `Workflow documentation sent to ${to}`
      },
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
