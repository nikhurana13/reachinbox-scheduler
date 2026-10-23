import nodemailer from 'nodemailer';
import { prisma } from '../src/db/prisma';
import { encrypt } from '../src/config/crypto';

// Usage: npm run senders -- 4     (creates 4 Ethereal accounts, default 3)
async function main() {
  const count = Number(process.argv[2] ?? 3);
  for (let i = 0; i < count; i++) {
    const acc = await nodemailer.createTestAccount();
    await prisma.sender.create({
      data: {
        email: acc.user,
        smtpHost: acc.smtp.host,
        smtpPort: acc.smtp.port,
        smtpUser: acc.user,
        smtpPass: encrypt(acc.pass),
      },
    });
    console.log(`created sender ${acc.user}  (inbox: https://ethereal.email/messages after login)`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
