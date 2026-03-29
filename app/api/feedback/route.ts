import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { message, name, email, page } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  try {
    await resend.emails.send({
      from: 'Hatchd Feedback <onboarding@resend.dev>',
      to: process.env.FEEDBACK_EMAIL!,
      subject: `Hatchd feedback${name ? ` from ${name}` : ''}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F4621F; margin-bottom: 4px;">New feedback</h2>
          ${page ? `<p style="color: #8C7B6E; font-size: 13px; margin-top: 0;">Page: ${page}</p>` : ''}
          <div style="background: #FFFAF3; border-left: 3px solid #F4621F; padding: 16px 20px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0; color: #2C1F14; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
          </div>
          ${name || email ? `
          <p style="color: #8C7B6E; font-size: 13px;">
            From: ${name || 'anonymous'}${email ? ` &lt;${email}&gt;` : ''}
          </p>` : '<p style="color: #C4B5A5; font-size: 13px;">Sent anonymously</p>'}
        </div>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Feedback email error:', e);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
