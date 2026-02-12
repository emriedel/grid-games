import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// CORS headers for local development (games run on different ports)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface FeedbackPayload {
  type: 'feedback' | 'bug';
  name?: string;
  email?: string;
  message: string;
  context?: {
    url: string;
    userAgent: string;
    viewport: string;
    timestamp: string;
    devicePixelRatio?: number;
    touchEnabled?: boolean;
    screenshot?: string;
    consoleErrors?: string[];
  };
}

function formatFeedbackEmail(data: FeedbackPayload): string {
  const fromLine = data.name
    ? (data.email ? `${data.name} &lt;${data.email}&gt;` : data.name)
    : (data.email ? data.email : 'Anonymous');

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
      <div style="border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #111827; margin: 0; font-size: 20px;">New Feedback</h2>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">from Nerdcube Games</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 60px; vertical-align: top;">From</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${fromLine}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Message</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; white-space: pre-wrap;">${escapeHtml(data.message)}</td>
        </tr>
      </table>
    </div>
  `;
}

function formatBugReportEmail(data: FeedbackPayload, hasScreenshot: boolean): string {
  const ctx = data.context;

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
      <div style="border-bottom: 3px solid #ef4444; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #111827; margin: 0; font-size: 20px;">Bug Report</h2>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">from Nerdcube Games</p>
      </div>

      <div style="margin-bottom: 24px;">
        <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Description</p>
        <p style="color: #111827; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(data.message)}</p>
      </div>

      ${ctx ? `
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Context</p>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; padding: 4px 12px 4px 0; white-space: nowrap; vertical-align: top;">URL</td>
              <td style="color: #111827; padding: 4px 0; word-break: break-all;">${escapeHtml(ctx.url)}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 12px 4px 0; white-space: nowrap; vertical-align: top;">Viewport</td>
              <td style="color: #111827; padding: 4px 0;">${escapeHtml(ctx.viewport)}${ctx.devicePixelRatio ? ` @${ctx.devicePixelRatio}x` : ''}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 12px 4px 0; white-space: nowrap; vertical-align: top;">Input</td>
              <td style="color: #111827; padding: 4px 0;">${ctx.touchEnabled ? 'Touch' : 'Mouse/Keyboard'}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 12px 4px 0; white-space: nowrap; vertical-align: top;">Time</td>
              <td style="color: #111827; padding: 4px 0;">${escapeHtml(ctx.timestamp)}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 12px 4px 0; white-space: nowrap; vertical-align: top;">Browser</td>
              <td style="color: #111827; padding: 4px 0; font-size: 12px; word-break: break-word;">${escapeHtml(ctx.userAgent)}</td>
            </tr>
          </table>
        </div>
      ` : ''}

      ${ctx?.consoleErrors && ctx.consoleErrors.length > 0 ? `
        <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #991b1b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Console Errors (${ctx.consoleErrors.length})</p>
          <pre style="background: #1f2937; color: #f87171; padding: 12px; border-radius: 4px; font-size: 11px; overflow-x: auto; margin: 0; white-space: pre-wrap; word-break: break-all;">${ctx.consoleErrors.map(e => escapeHtml(e)).join('\n')}</pre>
        </div>
      ` : ''}

      ${hasScreenshot ? `
        <div>
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Screenshot</p>
          <p style="color: #111827; font-size: 13px; margin: 0;">See attached image: screenshot.png</p>
        </div>
      ` : ''}
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: Request) {
  try {
    const data: FeedbackPayload = await request.json();

    // Validate required fields
    if (!data.message || !data.type) {
      return NextResponse.json(
        { error: 'Message and type are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const feedbackEmail = process.env.FEEDBACK_EMAIL;

    if (!apiKey || !feedbackEmail) {
      console.error('Missing RESEND_API_KEY or FEEDBACK_EMAIL environment variable');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    const resend = new Resend(apiKey);

    const isBug = data.type === 'bug';
    const subject = isBug
      ? `[Bug Report] ${data.message.slice(0, 50)}${data.message.length > 50 ? '...' : ''}`
      : `[Feedback] from ${data.name || 'Anonymous'}`;

    // Extract screenshot for attachment if present
    let screenshotAttachment: { filename: string; content: Buffer } | undefined;
    if (isBug && data.context?.screenshot) {
      try {
        // Extract base64 data from data URL (format: data:image/png;base64,xxxxx)
        const base64Match = data.context.screenshot.match(/^data:image\/\w+;base64,(.+)$/);
        if (base64Match) {
          screenshotAttachment = {
            filename: 'screenshot.png',
            content: Buffer.from(base64Match[1], 'base64'),
          };
        }
      } catch (err) {
        console.warn('Failed to process screenshot:', err);
      }
    }

    const html = isBug
      ? formatBugReportEmail(data, !!screenshotAttachment)
      : formatFeedbackEmail(data);

    const result = await resend.emails.send({
      from: 'Nerdcube Games <onboarding@resend.dev>',
      to: feedbackEmail,
      replyTo: data.email || undefined,
      subject,
      html,
      attachments: screenshotAttachment ? [screenshotAttachment] : undefined,
    });

    // Check if Resend returned an error
    if (result.error) {
      console.error('Resend API error:', result.error);
      return NextResponse.json(
        { error: result.error.message || 'Failed to send email' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Email sent successfully:', result.data?.id);
    return NextResponse.json(
      { success: true, emailId: result.data?.id },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Failed to send feedback email:', error);
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500, headers: corsHeaders }
    );
  }
}
