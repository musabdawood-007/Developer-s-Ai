import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendOtpEmail(
  toEmail: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "Email service is not configured.",
    };
  }

  const fromName = process.env.EMAIL_FROM_NAME || "Developer's Ai";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "developer.bot.ai@gmail.com";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a1a; padding: 32px; border-radius: 16px; border: 1px solid #1a3a2a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #10b981; font-size: 24px; margin: 0;">Developer's Ai</h1>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Verification Code</p>
      </div>
      <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6;">
        Hi there! You're verifying your account on Developer's Ai.
      </p>
      <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6;">
        Use the following code to continue:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <div style="display: inline-block; background: #1a2a3a; border: 2px solid #10b981; border-radius: 12px; padding: 16px 48px;">
          <span style="font-size: 36px; font-weight: bold; color: #10b981; letter-spacing: 8px; font-family: monospace;">${otp}</span>
        </div>
      </div>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
        This code is valid for 10 minutes. If you didn't request this, please ignore this email — no action is needed.
      </p>
      <hr style="border: none; border-top: 1px solid #1a3a2a; margin: 24px 0;">
      <p style="color: #64748b; font-size: 11px; text-align: center;">
        Developer's Ai · Built by Musab Dawood
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: toEmail,
      replyTo: fromAddress,
      subject: `Your Developer's Ai verification code: ${otp}`,
      html,
      text: `Developer's Ai\n\nYour verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\n— Developer's Ai (Built by Musab Dawood)`,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
        "X-Mailer": "Developer's Ai Mailer",
        "X-Auto-Response-Suppress": "All",
        "List-Unsubscribe": `<mailto:${fromAddress}?subject=unsubscribe>`,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("[email] sendOtpEmail error:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { success: false, error: message };
  }
}
