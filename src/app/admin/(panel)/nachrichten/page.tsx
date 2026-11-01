import { formatDateTimeDe } from "@/lib/datetime";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { toggleMessageHandled } from "../../actions";

export const metadata = { title: "Nachrichten" };

export default async function MessagesPage() {
  await requireAdmin();
  const messages = await db().contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 className="display text-4xl">Kontaktnachrichten</h1>
      <p className="mt-2 text-sm text-mist">Die letzten {messages.length} Nachrichten aus dem Kontaktformular.</p>
      <ul className="mt-8 space-y-4">
        {messages.length === 0 && <li className="border border-white/[0.08] p-8 text-center text-mist">Noch keine Nachrichten.</li>}
        {messages.map((m) => (
          <li key={m.id} className={`border p-6 ${m.handled ? "border-white/[0.06] opacity-60" : "border-white/[0.12] bg-coal"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[0.62rem]">{m.subject}</p>
                <p className="mt-2 font-display text-2xl">{m.name}</p>
                <p className="mt-1 text-sm">
                  <a href={`mailto:${m.email}`} className="text-gold hover:underline">
                    {m.email}
                  </a>
                  {m.phone && <span className="text-mist"> · {m.phone}</span>}
                </p>
              </div>
              <div className="text-right text-xs text-mist">
                <p>{formatDateTimeDe(m.createdAt)}</p>
                <p className="mt-1">{m.emailSentAt ? "per E-Mail zugestellt" : `E-Mail nicht zugestellt${m.emailError ? ` (${m.emailError})` : ""}`}</p>
                <form action={toggleMessageHandled} className="mt-3">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="handled" value={m.handled ? "false" : "true"} />
                  <button className="border border-white/15 px-3 py-1.5 uppercase tracking-[0.14em] text-ivory/80 hover:border-gold hover:text-gold">
                    {m.handled ? "Als offen markieren" : "Als erledigt markieren"}
                  </button>
                </form>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ivory/85">{m.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
