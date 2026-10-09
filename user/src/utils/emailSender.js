/**
 * Sends via the Hostinger Mail API (official SDK), not raw SMTP —
 * SMTP auth from this host was failing (535 error). The API sends through
 * an actual Hostinger mailbox, identified by its resourceId, rather than
 * an arbitrary "from" address: getCurrentAccount() looks up the mailbox
 * matching config.smtp.fromEmail once, then every send reuses that id.
 */
const { AccountApi, SendApi, Configuration } = require('hostinger-mail-api-sdk');
const config = require('../config/config');

const configuration = new Configuration({ accessToken: config.hostingerMailApi.token });
const accountApi = new AccountApi(configuration);
const sendApi = new SendApi(configuration);

let cachedResourceId = null;

async function getMailboxResourceId() {
  if (cachedResourceId) return cachedResourceId;

  const { data } = await accountApi.getCurrentAccount();
  const mailbox = data.data.mailboxes.find(
    (m) => m.address.toLowerCase() === config.smtp.fromEmail.toLowerCase()
  );
  if (!mailbox) {
    throw new Error(
      `No Hostinger mailbox found matching SMTP_FROM_EMAIL="${config.smtp.fromEmail}". ` +
      `Check the address exists in hPanel and the API token has access to it.`
    );
  }
  cachedResourceId = mailbox.resourceId;
  return cachedResourceId;
}

async function sendEmail(toEmail, subject, htmlBody) {
  if (config.app.debug) {
    console.log(`DEV email to ${toEmail}: ${subject}`);
    return;
  }
  const resourceId = await getMailboxResourceId();
  await sendApi.sendEmail(resourceId, {
    to: [toEmail],
    subject,
    html: htmlBody,
  });
  console.log(`✅ Email sent to ${toEmail} via mailbox ${resourceId}`);
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const subject = 'Reset your password';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 0 40px 30px 40px; color: #374151; font-size: 16px; line-height: 24px;">
                    <p style="margin: 0 0 20px 0;">Hi there,</p>
                    <p style="margin: 0 0 25px 0;">We received a request to reset the password for your account. If you made this request, click the button below to choose a new password:</p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px 0;">
                          <a href="${resetLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Reset Password</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;">This link will expire in <strong>${config.tokens.passwordResetExpireMinutes} minutes</strong>.</p>
                    <p style="margin: 0 0 25px 0; font-size: 14px; color: #6b7280;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <!-- Fallback Link -->
                    <p style="margin: 0; font-size: 13px; color: #9ca3af; word-break: break-all;">
                      Having trouble with the button? Copy and paste this URL into your browser:<br>
                      <a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">${resetLink}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Ahaan Software Consulting. All rights reserved.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail(toEmail, subject, html);
}

async function sendVerificationEmail(toEmail, verifyLink) {
  const subject = 'Verify your email address';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">Welcome to Ahaan Software Consulting!</h2>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 0 40px 30px 40px; color: #374151; font-size: 16px; line-height: 24px;">
                    <p style="margin: 0 0 20px 0;">Hi there,</p>
                    <p style="margin: 0 0 25px 0;">Thanks for signing up! We're excited to have you on board. Please verify your email address by clicking the button below to complete your registration:</p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px 0;">
                          <a href="${verifyLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Verify Email Address</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;">This verification link will expire in <strong>${config.tokens.emailVerificationExpireHours} hours</strong>.</p>
                    <p style="margin: 0 0 25px 0; font-size: 14px; color: #6b7280;">If you didn't create an account with Ahaan Software Consulting, you can safely ignore this email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <!-- Fallback Link -->
                    <p style="margin: 0; font-size: 13px; color: #9ca3af; word-break: break-all;">
                      Having trouble with the button? Copy and paste this URL into your browser:<br>
                      <a href="${verifyLink}" style="color: #2563eb; text-decoration: underline;">${verifyLink}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Ahaan Software Consulting. All rights reserved.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
  await sendEmail(toEmail, subject, html);
}

module.exports = { sendEmail, sendPasswordResetEmail, sendVerificationEmail };