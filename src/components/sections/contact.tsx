import { ContactForm } from "@/components/contact/contact-form";
import { MailIcon, PhoneIcon, PinIcon, WhatsappIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { company, mailHref, telHref } from "@/config/company";
import { whatsappHref } from "@/lib/whatsapp";

export function Contact() {
  const channels = [
    { href: telHref, label: "Telefon", value: company.phone.display, Icon: PhoneIcon, external: false },
    { href: mailHref, label: "E-Mail", value: company.email, Icon: MailIcon, external: false },
    { href: whatsappHref(), label: "WhatsApp", value: "Nachricht schreiben", Icon: WhatsappIcon, external: true },
  ];
  return (
    <section id="kontakt" aria-labelledby="kontakt-title" className="relative bg-coal py-28 md:py-40">
      <div className="container-lux grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            id="kontakt-title"
            eyebrow="Kontakt"
            title={
              <>
                Wir sind <em className="font-light italic text-gold">für Sie da.</em>
              </>
            }
            intro="Für Fragen, Firmenkunden oder ein individuelles Angebot – schreiben Sie uns oder rufen Sie direkt an."
          />
          <Reveal delay={0.1}>
            <ul className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {channels.map(({ href, label, value, Icon, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-5 py-5 transition-colors"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors duration-500 group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.62rem] uppercase tracking-[0.22em] text-mist">{label}</span>
                      <span className="mt-1 block break-all text-lg text-ivory transition-colors group-hover:text-gold">{value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex gap-5 text-sm leading-relaxed text-mist">
              <PinIcon size={20} className="mt-0.5 shrink-0 text-gold" />
              <p>
                <span className="block text-[0.62rem] uppercase tracking-[0.22em] text-ivory/50">Geschäftsanschrift</span>
                {company.legalName}
                <br />
                {company.address.street}, {company.address.postalCode} {company.address.city}
                <br />
                <span className="text-xs">Die Abholung erfolgt an Ihrer Wunschadresse.</span>
              </p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="lg:col-span-7">
          <div className="border border-white/[0.07] bg-graphite/60 p-6 sm:p-10">
            <h3 className="display mb-8 text-[1.9rem]">Nachricht senden</h3>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
