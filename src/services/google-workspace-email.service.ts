import "server-only";

import nodemailer from "nodemailer";

import type {
  EmailProvider,
  InvitationEmail,
} from "@/domain/services/email-provider";
import { getServerEnvironment } from "@/lib/env";

export class GoogleWorkspaceEmailService implements EmailProvider {
  async sendUserInvitation(input: InvitationEmail): Promise<void> {
    const environment = getServerEnvironment();
    if (
      !environment.SMTP_USER ||
      !environment.SMTP_PASSWORD ||
      !environment.SMTP_FROM_EMAIL
    ) {
      throw new Error("Google Workspace SMTP is not configured.");
    }
    const transporter = nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: environment.SMTP_PORT,
      secure: environment.SMTP_SECURE,
      auth: {
        user: environment.SMTP_USER,
        pass: environment.SMTP_PASSWORD,
      },
    });
    const expiry = new Intl.DateTimeFormat("th-TH", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(input.expiresAt);

    await transporter.sendMail({
      from: {
        name: environment.SMTP_FROM_NAME,
        address: environment.SMTP_FROM_EMAIL,
      },
      replyTo: environment.SMTP_REPLY_TO ?? environment.SMTP_FROM_EMAIL,
      to: input.to,
      subject: "เชิญเข้าใช้งานระบบ Hillkoff Asset Management",
      text: `สวัสดี ${input.displayName}\n\nกรุณาตั้งรหัสผ่านสำหรับระบบ Hillkoff Asset Management:\n${input.invitationUrl}\n\nลิงก์ใช้ได้ถึง ${expiry} และใช้ได้ครั้งเดียว`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#173b2a"><h2>Hillkoff Asset Management</h2><p>สวัสดี ${escapeHtml(input.displayName)}</p><p>บัญชีของคุณพร้อมแล้ว กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่าน</p><p><a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;background:#176b45;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">ตั้งรหัสผ่าน</a></p><p>ลิงก์ใช้ได้ถึง ${escapeHtml(expiry)} และใช้ได้ครั้งเดียว</p><hr><p style="color:#667085;font-size:13px">หากคุณไม่ได้รับคำเชิญนี้ โปรดติดต่อผู้ดูแลระบบ Hillkoff</p></div>`,
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        }) as const
      )[character as "&" | "<" | ">" | '"' | "'"],
  );
}
