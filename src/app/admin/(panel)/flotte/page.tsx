import { requireAdmin } from "@/lib/server/auth";
import { getFleetWithSettings } from "@/lib/server/fleet-settings";
import { saveFleetSetting } from "../../actions";

export const metadata = { title: "Flotte" };

export default async function FleetAdminPage() {
  await requireAdmin();
  const fleet = await getFleetWithSettings();
  return (
    <div>
      <h1 className="display text-4xl">Flotte</h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Legen Sie fest, welche Fahrzeugklassen online anfragbar sind und ob sie von DEENO bestätigt angeboten werden. Solange eine Klasse nicht bestätigt ist, wird sie auf der
        Website als „vorgeschlagene Flottenkonfiguration“ gekennzeichnet. Stammdaten (Bezeichnung, Kapazität, Ausstattung) werden in <code>src/config/fleet.ts</code> gepflegt.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {fleet.map((v) => (
          <form key={v.slug} action={saveFleetSetting} className="space-y-4 border border-white/[0.1] bg-coal p-6">
            <input type="hidden" name="slug" value={v.slug} />
            <div>
              <p className="eyebrow text-[0.62rem]">{v.category}</p>
              <p className="mt-2 font-display text-2xl">{v.model}</p>
              <p className="text-xs text-mist">
                bis {v.passengers} Fahrgäste · bis {v.luggage} Koffer
              </p>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={v.enabled} className="h-4 w-4 accent-[#C6A66B]" /> Online anfragbar
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="confirmed" defaultChecked={v.confirmed} className="h-4 w-4 accent-[#C6A66B]" /> Von DEENO bestätigt
            </label>
            <textarea name="note" rows={2} defaultValue={v.note ?? ""} className="field text-sm" placeholder="Interne Notiz (optional)" aria-label="Notiz" />
            <button className="btn btn-gold min-h-11 w-full">Speichern</button>
          </form>
        ))}
      </div>
    </div>
  );
}
