import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "SMTP is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local"
    );
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
    // Some hosts (e.g. this app's EC2 instance) have no IPv6 route, but
    // smtp.gmail.com resolves to an IPv6 address by default — force IPv4.
    // `family` isn't in nodemailer's TS types but is passed through to the
    // underlying net/tls connect call at runtime.
    family: 4,
  } as nodemailer.TransportOptions);
}

export async function sendAlertEmail(subject: string, text: string) {
  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    throw new Error("ALERT_EMAIL_TO is not configured in .env.local");
  }

  const transport = getTransport();
  await transport.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}
