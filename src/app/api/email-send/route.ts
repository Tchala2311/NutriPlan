import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, isUsingMockEmail } from '@/lib/email-service';

/**
 * POST /api/email-send
 * Send an email using email service (Resend in production, mock in development)
 * Body: {
 *   to: string (recipient email),
 *   subject: string,
 *   html: string (HTML content),
 *   from?: string (sender email, defaults to noreply@nutriplan.app)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, from = 'noreply@nutriplan.app' } = body;

    // Use centralized email service
    const result = await sendEmail({
      from,
      to,
      subject,
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes('Invalid') ? 400 : 500 }
      );
    }

    const response: Record<string, unknown> = {
      success: true,
      id: result.id,
    };

    // Add debug info in development
    if (isUsingMockEmail()) {
      response.note = 'Using mock email service (RESEND_API_KEY not configured)';
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
