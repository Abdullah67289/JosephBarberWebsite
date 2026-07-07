import { db } from "./db";
import { env } from "./env";
import { getSettings } from "./settings";
import { formatBookingWhen, toIcsUtc } from "./time";
import { formatMoney } from "./money";
import type { Booking, Customer, Service, Staff, SiteSettings } from "@prisma/client";

/**
 * Notification layer. Every message is recorded in NotificationLog. When a
 * provider key is present the message is actually sent; otherwise it is logged
 * with status "logged" so the whole flow works offline during development.
 */

type Channel = "email" | "sms";

interface LogInput {
  channel: Channel;
  to: string;
  template: string;
  subject?: string;
  body: string;
  status: string;
  error?: string;
  relatedType?: string;
  relatedId?: string;
}

async function record(input: LogInput) {
  try {
    await db.notificationLog.create({ data: input });
  } catch (err) {
    console.error("Failed to write NotificationLog", err);
  }
}

// ----------------------------------------------------------------- low-level send

export async function sendEmail(opts: {
  to?: string | null;
  subject: string;
  html: string;
  text: string;
  template: string;
  relatedType?: string;
  relatedId?: string;
}) {
  if (!opts.to) return;
  const settings = await getSettings();
  if (!settings.enableEmail) {
    await record({ channel: "email", to: opts.to, template: opts.template, subject: opts.subject, body: opts.text, status: "logged", error: "email disabled in settings", relatedType: opts.relatedType, relatedId: opts.relatedId });
    return;
  }
  if (!env.email.isConfigured) {
    console.info(`[email:logged] → ${opts.to} :: ${opts.subject}`);
    await record({ channel: "email", to: opts.to, template: opts.template, subject: opts.subject, body: opts.text, status: "logged", relatedType: opts.relatedType, relatedId: opts.relatedId });
    return;
  }
  try {
    // Plain fetch to Resend's REST API — the resend SDK pulls in
    // @react-email/render (+ prettier, ~260 KB) which we don't need since every
    // template here is already a raw HTML string, and it bloats the Worker
    // bundle past the 3 MiB limit. This is the only email call the app makes.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.email.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
    }
    await record({ channel: "email", to: opts.to, template: opts.template, subject: opts.subject, body: opts.text, status: "sent", relatedType: opts.relatedType, relatedId: opts.relatedId });
  } catch (err) {
    await record({ channel: "email", to: opts.to, template: opts.template, subject: opts.subject, body: opts.text, status: "failed", error: String(err), relatedType: opts.relatedType, relatedId: opts.relatedId });
  }
}

export async function sendSms(opts: {
  to?: string | null;
  body: string;
  template: string;
  relatedType?: string;
  relatedId?: string;
}) {
  if (!opts.to) return;
  const settings = await getSettings();
  if (!settings.enableSms) {
    await record({ channel: "sms", to: opts.to, template: opts.template, body: opts.body, status: "logged", error: "sms disabled in settings", relatedType: opts.relatedType, relatedId: opts.relatedId });
    return;
  }
  if (!env.sms.isConfigured) {
    console.info(`[sms:logged] → ${opts.to} :: ${opts.body}`);
    await record({ channel: "sms", to: opts.to, template: opts.template, body: opts.body, status: "logged", relatedType: opts.relatedType, relatedId: opts.relatedId });
    return;
  }
  try {
    // Plain fetch to Twilio's REST API — the twilio Node SDK does not run on
    // Cloudflare Workers, and this is the only call the app makes.
    const sid = env.sms.accountSid;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env.sms.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: env.sms.from, To: opts.to, Body: opts.body }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Twilio ${res.status}: ${detail.slice(0, 300)}`);
    }
    await record({ channel: "sms", to: opts.to, template: opts.template, body: opts.body, status: "sent", relatedType: opts.relatedType, relatedId: opts.relatedId });
  } catch (err) {
    await record({ channel: "sms", to: opts.to, template: opts.template, body: opts.body, status: "failed", error: String(err), relatedType: opts.relatedType, relatedId: opts.relatedId });
  }
}

// ----------------------------------------------------------------- templates

type FullBooking = Booking & {
  service: Service;
  staff: Staff | null;
  customer: Customer;
};

function manageUrl(token: string) {
  return `${env.siteUrl}/booking/${token}`;
}

function emailShell(settings: SiteSettings, title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#0f0f10;font-family:Helvetica,Arial,sans-serif;color:#e8e6e1">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;border:1px solid #c4942b;color:#c4942b;letter-spacing:2px;padding:8px 16px;border-radius:6px;font-weight:700;text-transform:uppercase;font-size:13px">${settings.businessName}</div>
    </div>
    <div style="background:#1a1a1d;border:1px solid #2e2e33;border-radius:14px;padding:28px">
      <h1 style="margin:0 0 12px;font-size:22px;color:#fff">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#7c7a74;font-size:12px;margin-top:20px">
      ${settings.businessName} · ${settings.address}, ${settings.city} · ${settings.phone}
    </p>
  </div></body></html>`;
}

function detailRow(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#9a978f;font-size:14px">${label}</td><td style="padding:6px 0;color:#fff;font-size:14px;text-align:right">${value}</td></tr>`;
}

function bookingDetailsTable(b: FullBooking, tz: string) {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${detailRow("Service", b.service.name)}
    ${detailRow("Barber", b.staff?.name ?? "Any available barber")}
    ${detailRow("When", formatBookingWhen(b.startAt, tz))}
    ${detailRow("Reference", b.reference)}
    ${b.depositCents > 0 ? detailRow("Deposit", formatMoney(b.depositCents)) : ""}
    ${detailRow("Total", formatMoney(b.priceCents))}
  </table>`;
}

function ctaButton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#c4942b;color:#0f0f10;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;margin-top:8px">${label}</a>`;
}

// ----------------------------------------------------------------- public API

export async function notifyBookingConfirmation(b: FullBooking) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const url = manageUrl(b.manageToken);
  const when = formatBookingWhen(b.startAt, tz);

  await sendEmail({
    to: b.customer.email,
    template: "booking_confirmation",
    subject: `Booking confirmed — ${b.service.name} on ${when}`,
    html: emailShell(
      settings,
      "You're booked in 💈",
      `<p style="color:#cbc8c1;font-size:15px;line-height:1.6">Hi ${b.customer.name}, your appointment at ${settings.businessName} is confirmed.</p>
       ${bookingDetailsTable(b, tz)}
       <p style="color:#cbc8c1;font-size:14px">Need to make a change? You can reschedule or cancel any time:</p>
       ${ctaButton(url, "Manage booking")}`,
    ),
    text: `Hi ${b.customer.name}, your ${b.service.name} appointment with ${b.staff?.name ?? "any barber"} is confirmed for ${when}. Reference ${b.reference}. Manage your booking: ${url}`,
    relatedType: "booking",
    relatedId: b.id,
  });

  await sendSms({
    to: b.customer.phone,
    template: "booking_confirmation",
    body: `${settings.businessName}: You're booked for ${b.service.name} on ${when}. Ref ${b.reference}. Manage: ${url}`,
    relatedType: "booking",
    relatedId: b.id,
  });
}

export async function notifyBookingReminder(b: FullBooking) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const url = manageUrl(b.manageToken);
  const when = formatBookingWhen(b.startAt, tz);

  await sendEmail({
    to: b.customer.email,
    template: "booking_reminder",
    subject: `Reminder — ${b.service.name} on ${when}`,
    html: emailShell(
      settings,
      "See you soon ✂️",
      `<p style="color:#cbc8c1;font-size:15px;line-height:1.6">Hi ${b.customer.name}, a friendly reminder of your upcoming appointment.</p>
       ${bookingDetailsTable(b, tz)}
       ${ctaButton(url, "Manage booking")}`,
    ),
    text: `Reminder: ${b.service.name} with ${b.staff?.name ?? "your barber"} on ${when}. Ref ${b.reference}. Manage: ${url}`,
    relatedType: "booking",
    relatedId: b.id,
  });

  await sendSms({
    to: b.customer.phone,
    template: "booking_reminder",
    body: `${settings.businessName} reminder: ${b.service.name} on ${when}. See you soon!`,
    relatedType: "booking",
    relatedId: b.id,
  });
}

export async function notifyBookingRescheduled(b: FullBooking) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const url = manageUrl(b.manageToken);
  const when = formatBookingWhen(b.startAt, tz);

  await sendEmail({
    to: b.customer.email,
    template: "booking_rescheduled",
    subject: `Booking updated — now ${when}`,
    html: emailShell(
      settings,
      "Your booking was updated",
      `<p style="color:#cbc8c1;font-size:15px;line-height:1.6">Hi ${b.customer.name}, your appointment has a new time.</p>
       ${bookingDetailsTable(b, tz)}
       ${ctaButton(url, "Manage booking")}`,
    ),
    text: `Your ${b.service.name} appointment is now ${when}. Ref ${b.reference}. Manage: ${url}`,
    relatedType: "booking",
    relatedId: b.id,
  });

  await sendSms({
    to: b.customer.phone,
    template: "booking_rescheduled",
    body: `${settings.businessName}: your appointment is now ${when}. Ref ${b.reference}.`,
    relatedType: "booking",
    relatedId: b.id,
  });
}

export async function notifyBookingCancelled(b: FullBooking) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const when = formatBookingWhen(b.startAt, tz);

  await sendEmail({
    to: b.customer.email,
    template: "booking_cancelled",
    subject: `Booking cancelled — ${b.service.name}`,
    html: emailShell(
      settings,
      "Booking cancelled",
      `<p style="color:#cbc8c1;font-size:15px;line-height:1.6">Hi ${b.customer.name}, your ${b.service.name} appointment on ${when} has been cancelled. We hope to see you again soon.</p>
       ${ctaButton(env.siteUrl + "/book", "Book again")}`,
    ),
    text: `Your ${b.service.name} appointment on ${when} has been cancelled. Book again: ${env.siteUrl}/book`,
    relatedType: "booking",
    relatedId: b.id,
  });

  await sendSms({
    to: b.customer.phone,
    template: "booking_cancelled",
    body: `${settings.businessName}: your appointment on ${when} has been cancelled.`,
    relatedType: "booking",
    relatedId: b.id,
  });
}

export async function notifyAdminNewBooking(b: FullBooking) {
  const settings = await getSettings();
  const tz = settings.timezone;
  await sendEmail({
    to: env.email.adminTo,
    template: "admin_new_booking",
    subject: `New booking — ${b.service.name} · ${formatBookingWhen(b.startAt, tz)}`,
    html: emailShell(
      settings,
      "New booking received",
      `${bookingDetailsTable(b, tz)}
       <p style="color:#cbc8c1;font-size:14px">${b.customer.name} · ${b.customer.email} · ${b.customer.phone}</p>
       ${b.notes ? `<p style="color:#9a978f;font-size:13px">Note: ${b.notes}</p>` : ""}`,
    ),
    text: `New booking: ${b.service.name} with ${b.staff?.name ?? "any"} on ${formatBookingWhen(b.startAt, tz)} for ${b.customer.name} (${b.customer.phone}). Ref ${b.reference}.`,
    relatedType: "booking",
    relatedId: b.id,
  });
}

export async function notifyAdminCancellation(b: FullBooking) {
  const settings = await getSettings();
  const tz = settings.timezone;
  await sendEmail({
    to: env.email.adminTo,
    template: "admin_cancellation",
    subject: `Cancellation — ${b.service.name} · ${formatBookingWhen(b.startAt, tz)}`,
    html: emailShell(
      settings,
      "Booking cancelled",
      `${bookingDetailsTable(b, tz)}
       <p style="color:#cbc8c1;font-size:14px">${b.customer.name} · ${b.customer.phone}</p>`,
    ),
    text: `Cancellation: ${b.service.name} on ${formatBookingWhen(b.startAt, tz)} (${b.customer.name}). Ref ${b.reference}.`,
    relatedType: "booking",
    relatedId: b.id,
  });
}

export async function notifyContactMessage(msg: { name: string; email: string; phone?: string | null; subject?: string | null; message: string }) {
  const settings = await getSettings();
  await sendEmail({
    to: env.email.adminTo,
    template: "contact_message",
    subject: `New enquiry — ${msg.subject || "Website contact"}`,
    html: emailShell(
      settings,
      "New website enquiry",
      `<p style="color:#fff">${msg.name} &lt;${msg.email}&gt;${msg.phone ? " · " + msg.phone : ""}</p>
       <p style="color:#cbc8c1;font-size:15px;line-height:1.6;white-space:pre-wrap">${msg.message}</p>`,
    ),
    text: `New enquiry from ${msg.name} (${msg.email}${msg.phone ? ", " + msg.phone : ""}):\n\n${msg.message}`,
    relatedType: "contact",
  });
}

export async function notifyOrderConfirmation(order: {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalCents: number;
  fulfillmentType: string;
  items: { name: string; quantity: number; totalCents: number; variantLabel?: string | null }[];
}) {
  const settings = await getSettings();
  const rows = order.items
    .map(
      (i) =>
        `${detailRow(`${i.quantity}× ${i.name}${i.variantLabel ? " (" + i.variantLabel + ")" : ""}`, formatMoney(i.totalCents))}`,
    )
    .join("");
  await sendEmail({
    to: order.customerEmail,
    template: "order_confirmation",
    subject: `Order confirmed — ${order.reference}`,
    html: emailShell(
      settings,
      "Order confirmed 🛍️",
      `<p style="color:#cbc8c1;font-size:15px">Thanks ${order.customerName}! Your order is confirmed${order.fulfillmentType === "pickup" ? " for in-store pickup" : ""}.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}${detailRow("Total", formatMoney(order.totalCents))}</table>`,
    ),
    text: `Order ${order.reference} confirmed. Total ${formatMoney(order.totalCents)}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  await sendSms({
    to: order.customerPhone,
    template: "order_confirmation",
    body: `${settings.businessName}: order ${order.reference} confirmed. Total ${formatMoney(order.totalCents)}.`,
    relatedType: "order",
    relatedId: order.id,
  });
}

// ----------------------------------------------------------------- calendar (ICS)

export function buildIcsForBooking(b: FullBooking, settings: SiteSettings): string {
  const uid = `${b.reference}@josephandmikes`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Joseph & Mike's//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(b.startAt)}`,
    `DTEND:${toIcsUtc(b.endAt)}`,
    `SUMMARY:${b.service.name} @ ${settings.businessName}`,
    `DESCRIPTION:Reference ${b.reference}${b.staff ? " with " + b.staff.name : ""}`,
    `LOCATION:${settings.address}, ${settings.city}, ${settings.region}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
