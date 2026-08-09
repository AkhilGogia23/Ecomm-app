import nodemailer from "nodemailer";
import { prisma } from "./prisma";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const fromName = process.env.EMAIL_FROM_NAME || "Store";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "";

  let status = "SENT";
  let error: string | null = null;

  try {
    if (!process.env.SMTP_USER) {
      throw new Error("SMTP is not configured");
    }
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (err) {
    status = "FAILED";
    error = err instanceof Error ? err.message : "Unknown error";
  }

  await prisma.emailLog.create({
    data: {
      to: input.to,
      subject: input.subject,
      status,
      error,
    },
  });
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

export async function sendTemplateEmail(
  templateSlug: string,
  to: string,
  variables: Record<string, string>
): Promise<void> {
  const template = await prisma.emailTemplate.findUnique({ where: { slug: templateSlug } });
  if (!template || !template.isActive) {
    throw new Error(`Email template "${templateSlug}" not found or inactive`);
  }

  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.bodyHtml, variables);

  await sendEmail({ to, subject, html });

  await prisma.emailLog.updateMany({
    where: { to, subject, templateSlug: null },
    data: { templateSlug },
  });
}

interface QueuedEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const emailQueue: QueuedEmail[] = [];
let queueProcessorStarted = false;

export function queueEmail(email: QueuedEmail): void {
  emailQueue.push(email);
  startQueueProcessor();
}

function startQueueProcessor(): void {
  if (queueProcessorStarted) return;
  queueProcessorStarted = true;

  setInterval(async () => {
    const next = emailQueue.shift();
    if (next) {
      await sendEmail(next);
    }
  }, 5000);
}
