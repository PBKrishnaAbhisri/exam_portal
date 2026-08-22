const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ''); // Strip any spaces from 16-char app password

  if (!user || !pass || user.includes('your_gmail') || pass.includes('your_16_char')) {
    console.warn('[Mailer] SMTP_USER or SMTP_PASS not configured in .env.');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Send exam notification emails to eligible students.
 * @param {Object} exam - The published exam object
 * @param {Array} students - Array of User objects with .name and .email
 */
const sendExamPublishNotifications = async (exam, students, onProgress = null) => {
  if (!students || students.length === 0) {
    return { success: false, sentCount: 0, reason: 'No eligible students found matching exam criteria.' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[Mailer] SMTP not configured in .env (SMTP_USER/SMTP_PASS).');
    return {
      success: false,
      sentCount: 0,
      eligibleCount: students.length,
      reason: 'SMTP not configured in backend/.env. Please set SMTP_USER and SMTP_PASS to send emails.',
    };
  }

  const examUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student`;
  const startTime = new Date(exam.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const endTime = new Date(exam.endTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  let sentCount = 0;
  const errors = [];

  // Send one-by-one so we can emit progress after each email
  for (const student of students) {
    await transporter.sendMail({
      from: `"RGUKT Exam Portal" <${process.env.SMTP_USER}>`,
      to: student.email,
      subject: `📋 New Exam Scheduled: ${exam.title}`,
      html: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 12px;">
            <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">📋 New Exam Scheduled</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">RGUKT Exam Portal</p>
            </div>
            <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #475569; margin: 0 0 16px 0;">Hi <strong>${student.name}</strong>,</p>
              <p style="color: #475569; margin: 0 0 24px 0;">A new exam has been scheduled that matches your branch/domains. Details below:</p>
              
              <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                  <tr><td style="padding: 4px 0; font-weight: 600; width: 40%;">Exam Title</td><td style="padding: 4px 0;">${exam.title}</td></tr>
                  <tr><td style="padding: 4px 0; font-weight: 600;">Subject</td><td style="padding: 4px 0;">${exam.subject || 'General'}</td></tr>
                  <tr><td style="padding: 4px 0; font-weight: 600;">Exam Code</td><td style="padding: 4px 0; font-family: monospace; font-size: 16px; color: #2563eb; font-weight: bold;">${exam.examCode}</td></tr>
                  <tr><td style="padding: 4px 0; font-weight: 600;">Starts At</td><td style="padding: 4px 0;">${startTime} IST</td></tr>
                  <tr><td style="padding: 4px 0; font-weight: 600;">Ends At</td><td style="padding: 4px 0;">${endTime} IST</td></tr>
                  <tr><td style="padding: 4px 0; font-weight: 600;">Duration</td><td style="padding: 4px 0;">${exam.duration} minutes</td></tr>
                </table>
              </div>

              <div style="text-align: center;">
                <a href="${examUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Open Exam Portal &rarr;
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                This email was sent to ${student.email} because you are eligible for this exam.<br>
                RGUKT Nuzvid — Online Examination Portal
              </p>
            </div>
          </div>
        `,
    }).then(() => {
      sentCount++;
    }).catch(err => {
      console.error(`[Mailer] Failed sending to ${student.email}:`, err.message);
      errors.push({ email: student.email, error: err.message });
    });

    // Emit progress after each email attempt (success or failure)
    if (onProgress) {
      onProgress({ sent: sentCount, failed: errors.length, total: students.length });
    }
  }

  console.log(`[Mailer] Successfully sent ${sentCount}/${students.length} emails.`);
  
  let reason = null;
  if (sentCount === 0 && errors.length > 0) {
    const isAuthError = errors.some(e => e.error?.includes('535') || e.error?.includes('BadCredentials') || e.error?.includes('Username and Password not accepted'));
    if (isAuthError) {
      reason = 'Gmail rejected your login (535 BadCredentials). Please generate and use a 16-character Gmail App Password (not your normal password) in backend/.env.';
    } else {
      reason = errors[0].error;
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    eligibleCount: students.length,
    reason,
    errors,
  };
};

module.exports = { sendExamPublishNotifications };
