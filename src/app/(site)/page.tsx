import { About } from "@/components/sections/about";
import { Advantages } from "@/components/sections/advantages";
import { Booking } from "@/components/sections/booking";
import { Contact } from "@/components/sections/contact";
import { Faq } from "@/components/sections/faq";
import { Fleet } from "@/components/sections/fleet";
import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { ChauffeurStory } from "@/components/story/chauffeur-story";
import { company, siteUrl } from "@/config/company";
import { faqs, services } from "@/config/content";
import { getFleetWithSettings } from "@/lib/server/fleet-settings";
import { isPlacesConfigured } from "@/lib/server/maps";

// Flotten-Verfügbarkeit wird im Adminbereich gepflegt → regelmäßig neu erzeugen
export const revalidate = 300;

function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function HomePage() {
  const fleet = await getFleetWithSettings();

  const business = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#business`,
    name: company.legalName,
    alternateName: "DEENO",
    description: "Chauffeur- und Limousinenservice: Flughafentransfer, Business- und VIP-Fahrten, Event- und Hochzeitsfahrten sowie Stundenbuchungen.",
    url: siteUrl,
    image: `${siteUrl}/opengraph-image`,
    telephone: company.phone.e164,
    email: company.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.street,
      postalCode: company.address.postalCode,
      addressLocality: company.address.city,
      addressCountry: company.address.countryCode,
    },
    areaServed: company.serviceArea.map((name) => ({ "@type": "Place", name })),
    makesOffer: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.description } })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <JsonLd data={business} />
      <JsonLd data={faqLd} />
      <Hero />
      <ChauffeurStory />
      <Services />
      <Fleet fleet={fleet} />
      <Advantages />
      <About />
      <Booking fleet={fleet} placesEnabled={isPlacesConfigured()} />
      <Faq />
      <Contact />
    </>
  );
}
