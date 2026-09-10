import nodemailer from "nodemailer";
import dns from "node:dns";

// Some hosts (e.g. this app's production EC2 instance) have no IPv6 route,
// but Node 17+ interleaves IPv6 first by default when resolving hostnames —
// smtp.gmail.com has an IPv6 address, so connections failed with
// ENETUNREACH there. Passing `family: 4` directly to nodemailer's transport
// options did NOT fix this (it isn't honored by its connection logic), so
// force IPv4-first resolution process-wide instead.
dns.setDefaultResultOrder("ipv4first");

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
  });
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
