import "server-only";
import { Resend } from "resend";

export type MailResult =
  | { status: "sent"; id: string }
  | { status: "logged" } // nur Entwicklung: NICHT versendet
  | { status: "disabled"; reason: string }
  | { status: "failed"; error: string };

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

let client: Resend | null = null;

export function mailConfig() {
  const transport = process.env.MAIL_TRANSPORT || (process.env.RESEND_API_KEY ? "resend" : "none");
  return {
    transport,
    from: process.env.MAIL_FROM || "",
    operatorTo: process.env.MAIL_OPERATOR_TO || "Firmawajdideeno@yahoo.com",
    replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_OPERATOR_TO || "Firmawajdideeno@yahoo.com",
  };
}

/** Versendet eine E-Mail und meldet ehrlich zurück, ob sie tatsächlich versendet wurde. */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const cfg = mailConfig();

  if (cfg.transport === "log") {
    if (process.env.NODE_ENV === "production") {
      return { status: "disabled", reason: "MAIL_TRANSPORT=log ist in Produktion nicht zulässig." };
    }
    console.info(`[mail:log] (NICHT versendet) an=${String(msg.to)} betreff="${msg.subject}"\n${msg.text}\n`);
    return { status: "logged" };
  }

  if (cfg.transport !== "resend" || !process.env.RESEND_API_KEY) {
    return { status: "disabled", reason: "Kein E-Mail-Dienst konfiguriert (RESEND_API_KEY fehlt)." };
  }
  if (!cfg.from) return { status: "disabled", reason: "MAIL_FROM ist nicht gesetzt." };

  try {
    client ??= new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await client.emails.send({
      from: cfg.from,
      to: msg.to,
      subject: msg.subject.replace(/[\r\n]+/g, " ").slice(0, 250),
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
    });
    if (error || !data) return { status: "failed", error: error?.message ?? "Unbekannter Fehler beim Versand." };
    return { status: "sent", id: data.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

export const wasDelivered = (r: MailResult) => r.status === "sent";
