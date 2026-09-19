import dotenv from "dotenv";
dotenv.config();

let nodemailerModule = null;

async function getNodemailer() {
  if (nodemailerModule) return nodemailerModule;
  try {
    const mod = await import("nodemailer");
    nodemailerModule = mod.default || mod;
    return nodemailerModule;
  } catch {
    return null;
  }
}

/**
 * Creates or retrieves the SMTP transporter.
 */
async function getTransporter() {
  const nodemailer = await getNodemailer();
  if (!nodemailer) return null;

  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Generates modern, responsive HTML email template for 7-day inactivity reminders.
 */
function buildInactivityReminderTemplate({ name, siteUrl }) {
  const portalUrl = siteUrl || "https://a100158.onrender.com";
  const displayName = name ? name.split(" ")[0] : "Member";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bug Slayers Portal - Profile & Activity Update</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background: linear-gradient(180deg, #131b2e 0%, #0d1322 100%);
      border: 1px solid rgba(139, 92, 246, 0.25);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      padding: 32px 28px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .intro {
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .section-box {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #c084fc;
      display: flex;
      align-items: center;
      margin-bottom: 6px;
    }
    .section-text {
      font-size: 13.5px;
      color: #cbd5e1;
      line-height: 1.5;
      margin: 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 16px 0;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 34px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4);
      letter-spacing: 0.3px;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 20px 28px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>BUG SLAYERS</h1>
        <p>Community Progress Reminder</p>
      </div>

      <div class="content">
        <div class="greeting">Hey ${displayName}, we miss you! 👋</div>
        <p class="intro">
          We noticed that you haven't logged into the <strong>Bug Slayers Portal</strong> over the last <strong>7 days</strong>.
          Regular updates keep your profile recognized, maintain your leaderboard ranking, and highlight your contributions to the club!
        </p>

        <div class="section-box">
          <div class="section-title">📚 Course Progress Updates</div>
          <p class="section-text">
            Have you completed new course modules or unlocked fresh levels? Log your new levels and submit certifications so your portfolio reflects your mastery.
          </p>
        </div>

        <div class="section-box">
          <div class="section-title">🏆 Activity Points & Reward Points</div>
          <p class="section-text">
            Make sure all your recent hackathon contributions, workshop attendances, and special projects have been recorded to keep your reward points climbing.
          </p>
        </div>

        <div class="section-box">
          <div class="section-title">🎯 Assigned Tasks & Deliverables</div>
          <p class="section-text">
            Check your task queue for any newly assigned deliverables, code reviews, or updates from your cluster leads.
          </p>
        </div>

        <div class="btn-container">
          <a href="${portalUrl}" class="cta-btn" target="_blank">
            Update My Profile & Points →
          </a>
        </div>
      </div>

      <div class="footer">
        You received this automated reminder because you are an active member of Bug Slayers.<br>
        Portal: <a href="${portalUrl}" style="color: #8b5cf6; text-decoration: none;">${portalUrl}</a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends an email notification to a member.
 * If SMTP credentials are not configured, logs a simulated message cleanly without erroring.
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Bug Slayers Team" <no-reply@bugslayers.club>';

  try {
    const transporter = await getTransporter();

    if (!transporter) {
      console.log(`ℹ️ [Email Simulation] To: ${to} | Subject: "${subject}" (Configure EMAIL_USER & EMAIL_PASS in .env for live delivery)`);
      return { success: true, simulated: true };
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || "Please check your Bug Slayers portal for updates.",
      html,
    });

    console.log(`✅ [Email Sent] Successfully delivered to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId, simulated: false };
  } catch (err) {
    console.warn(`⚠️ [Email Error] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a 7-day inactivity reminder email to a member.
 */
export async function sendInactivityReminderEmail({ email, name, siteUrl }) {
  const subject = "⚡ Friendly Reminder: Update your Course Progress & Points on Bug Slayers!";
  const html = buildInactivityReminderTemplate({ name, siteUrl });
  const text = `Hey ${name || "Member"},\n\nWe noticed you haven't logged into the Bug Slayers Portal over the last 7 days.\n\nPlease log in to update your course levels, activity points, and reward points: ${siteUrl || "https://a100158.onrender.com"}\n\n- Bug Slayers Team`;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
