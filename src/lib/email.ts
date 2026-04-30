import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

function createTransport() {
  if (!gmailUser || !gmailAppPassword) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

export async function sendInviteEmail(
  to: string,
  inviteLink: string
): Promise<{ sent: boolean; error?: string }> {
  const transport = createTransport();

  if (!transport) {
    return { sent: false, error: "Email not configured" };
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="font-size: 24px; font-weight: 800; color: #1C1917; margin: 0 0 8px;">
        Family Events
      </h1>
      <p style="color: #78716C; font-size: 14px; margin: 0 0 24px;">
        You&rsquo;ve been invited to join the family
      </p>

      <div style="background: #FFFBF5; border: 1px solid #E7E5E4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #1C1917; font-size: 16px; margin: 0 0 16px;">
          Someone in your family wants you to join <strong>Family Events</strong> &mdash;
          a place to plan get-togethers, share photos, and stay connected.
        </p>

        <a href="${inviteLink}"
           style="display: inline-block; background: #F97066; color: white; padding: 12px 28px;
                  border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Accept Invite
        </a>
      </div>

      <p style="color: #78716C; font-size: 12px; margin: 0;">
        Or copy this link: <a href="${inviteLink}" style="color: #F97066;">${inviteLink}</a>
      </p>
    </div>
  `;

  try {
    await transport.sendMail({
      from: `"Family Events" <${gmailUser}>`,
      to,
      subject: "You're invited to Family Events",
      html,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to send invite email:", message);
    return { sent: false, error: message };
  }
}
