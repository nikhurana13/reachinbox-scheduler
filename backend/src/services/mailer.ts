import nodemailer, { Transporter } from 'nodemailer';
import type { Email, Sender } from '@prisma/client';
import { decrypt } from '../config/crypto';

const transports = new Map<string, Transporter>();

function transportFor(sender: Sender) {
  let t = transports.get(sender.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: { user: sender.smtpUser, pass: decrypt(sender.smtpPass) },
    });
    transports.set(sender.id, t);
  }
  return t;
}

export async function send(email: Email & { sender: Sender }) {
  const domain = email.sender.email.split('@')[1] ?? 'localhost';
  const info = await transportFor(email.sender).sendMail({
    from: email.sender.email,
    to: email.toEmail,
    subject: email.subject,
    text: email.body,
    // Deterministic Message-ID: a retried send is recognisable as the same message
    messageId: `<${email.id}@${domain}>`,
  });
  return { info, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}
