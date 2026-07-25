import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const SMTP_FROM = process.env.SMTP_FROM?.trim();

function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

export function validateSmtpConfigForProduction() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missingVars: string[] = [];
  if (!SMTP_HOST) missingVars.push("SMTP_HOST");
  if (!process.env.SMTP_PORT?.trim()) missingVars.push("SMTP_PORT");
  if (!SMTP_USER) missingVars.push("SMTP_USER");
  if (!SMTP_PASS) missingVars.push("SMTP_PASS");
  if (!SMTP_FROM) missingVars.push("SMTP_FROM");

  if (missingVars.length > 0) {
    throw new Error(`Missing required SMTP configuration: ${missingVars.join(", ")}`);
  }
}

async function sendMail(subject: string, to: string, html: string, text: string) {
  const mailer = getTransporter();
  if (!mailer) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP transporter is not configured.");
    }

    console.warn(`[mailer] SMTP not configured. Skipping email "${subject}" to ${to}.`);
    return;
  }

  await mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}

export async function sendVerificationEmail(to: string, name: string, verificationUrl: string) {
  await sendMail(
    "Verifica tu cuenta en TalentoMatch IA",
    to,
    `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Activa tu cuenta</h2>
        <p>Hola ${name},</p>
        <p>Haz clic en el siguiente enlace para verificar tu correo y activar tu acceso a TalentoMatch IA:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
      </div>
    `,
    `Hola ${name}, verifica tu correo con este enlace: ${verificationUrl}`,
  );
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await sendMail(
    "Recupera el acceso a TalentoMatch IA",
    to,
    `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Restablece tu contrasena</h2>
        <p>Hola ${name},</p>
        <p>Haz clic en el siguiente enlace para definir una nueva contrasena:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `,
    `Hola ${name}, restablece tu contrasena con este enlace: ${resetUrl}`,
  );
}
