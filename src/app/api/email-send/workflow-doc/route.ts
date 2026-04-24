import { NextRequest, NextResponse } from "next/server";
import { WORKFLOW_DOC_HTML } from "@/lib/workflow-doc";
import { sendEmail, isUsingMockEmail } from "@/lib/email-service";

/**
 * POST /api/email-send/workflow-doc
 * Send the workflow documentation to a specified email
 * Body: {
 *   to: string (recipient email, optional - defaults to process.env.WORKFLOW_DOC_RECIPIENT)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = body.to || process.env.WORKFLOW_DOC_RECIPIENT || "tsem7354@gmail.com";

    // Use centralized email service
    const result = await sendEmail({
      from: "noreply@nutriplan.app",
      to,
      subject: "NutriPlan Development Workflow Documentation",
      html: WORKFLOW_DOC_HTML,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("Invalid") ? 400 : 500 }
      );
    }

    const response: Record<string, unknown> = {
      success: true,
      id: result.id,
      message: `Workflow documentation sent to ${to}`,
    };

    // Add debug info in development
    if (isUsingMockEmail()) {
      response.note = "Using mock email service (RESEND_API_KEY not configured). In production, configure RESEND_API_KEY to send real emails.";
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
