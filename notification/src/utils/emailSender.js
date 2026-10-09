/**
 * Sends via the Hostinger Mail API (official SDK), not raw SMTP.
 * The API sends through an actual Hostinger mailbox, identified by its
 * resourceId, rather than an arbitrary "from" address — getCurrentAccount()
 * looks up the mailbox matching config.smtp.fromEmail once, then every
 * send reuses that id.
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

async function sendMail({ to, subject, html }) {
  if (!to) return;
  if (config.app.debug) {
    console.log(`DEV email to ${to}: ${subject}`);
    return;
  }
  const resourceId = await getMailboxResourceId();
  await sendApi.sendEmail(resourceId, { to: [to], subject, html });
  console.log(`✅ Email sent to ${to} via mailbox ${resourceId}`);
}

module.exports = { sendMail };