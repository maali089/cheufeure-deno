import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { bookingPaidCustomerMail, bookingPaidOperatorMail } from "@/lib/mail/templates";
import { mailConfig, sendMail } from "@/lib/mail/transport";
import { db, isDatabaseConfigured } from "@/lib/server/db";
import { isStripeConfigured, stripe, toCents } from "@/lib/server/payments";
import { logError } from "@/lib/server/log";

export const runtime = "nodejs";

/**
 * Stripe-Webhook. Verarbeitet jedes Ereignis genau einmal (StripeEvent-Tabelle),
 * prüft die Signatur und gleicht Betrag/Währung mit der gespeicherten Buchung ab.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured() || !isDatabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Idempotenz: Ereignis bereits verarbeitet?
  try {
    await db().stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    throw e;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handlePaid(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await setStatusIfPending(event.data.object as Stripe.Checkout.Session, "EXPIRED");
        break;
      case "checkout.session.async_payment_failed":
        await setStatusIfPending(event.data.object as Stripe.Checkout.Session, "FAILED");
        break;
      default:
        break;
    }
  } catch (e) {
    // Verarbeitung fehlgeschlagen → Ereignis wieder freigeben, damit Stripe erneut zustellt
    await db().stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    logError("stripe", e, "Verarbeitung fehlgeschlagen");
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function findBooking(session: Stripe.Checkout.Session) {
  const id = session.metadata?.bookingId ?? session.client_reference_id;
  if (!id) return null;
  const b = await db().bookingRequest.findUnique({ where: { id } });
  if (!b || b.stripeCheckoutSessionId !== session.id) return null;
  return b;
}

async function handlePaid(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return; // z. B. verzögerte Zahlarten: später via async_payment_succeeded
  const b = await findBooking(session);
  if (!b) {
    console.warn(`[stripe] Keine passende Buchung für Session ${session.id}`);
    return;
  }
  const expected = b.quotedPrice ? toCents(Number(b.quotedPrice)) : null;
  if (expected === null || session.amount_total !== expected || session.currency !== "eur") {
    console.error(`[stripe] Betrag stimmt nicht überein (${session.amount_total} ≠ ${expected}) für ${b.reference}`);
    await db().bookingRequest.update({ where: { id: b.id }, data: { adminNotes: `${b.adminNotes ? `${b.adminNotes}\n` : ""}ACHTUNG: Zahlungsbetrag weicht ab (${session.amount_total} Cent).` } });
    return;
  }

  // Bedingtes Update schützt vor doppelter Verarbeitung (nur einmal von PENDING/FAILED/EXPIRED → PAID)
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const res = await db().bookingRequest.updateMany({
    where: { id: b.id, paymentStatus: { not: "PAID" } },
    data: { paymentStatus: "PAID", paidAt: new Date(), amountPaidCents: session.amount_total, stripePaymentIntentId: paymentIntent ?? null, status: "CONFIRMED" },
  });
  if (res.count !== 1) return;
  await db().bookingStatusChange.create({ data: { bookingId: b.id, fromStatus: b.status, toStatus: "CONFIRMED", changedBy: "stripe", note: "Online-Zahlung erfolgreich" } });

  const cfg = mailConfig();
  const cu = bookingPaidCustomerMail(b);
  const op = bookingPaidOperatorMail(b);
  await Promise.all([
    sendMail({ to: b.email, subject: cu.subject, html: cu.html, text: cu.text, replyTo: cfg.replyTo }),
    sendMail({ to: cfg.operatorTo, subject: op.subject, html: op.html, text: op.text, replyTo: b.email }),
  ]);
}

async function setStatusIfPending(session: Stripe.Checkout.Session, status: "EXPIRED" | "FAILED") {
  const b = await findBooking(session);
  if (!b) return;
  await db().bookingRequest.updateMany({ where: { id: b.id, paymentStatus: "PENDING" }, data: { paymentStatus: status } });
}
