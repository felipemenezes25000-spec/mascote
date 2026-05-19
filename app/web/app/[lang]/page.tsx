import { notFound } from "next/navigation";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBlock } from "@/components/TrustBlock";
import { Personalities } from "@/components/Personalities";
import { Evolution } from "@/components/Evolution";
import { Features } from "@/components/Features";
import { Showcase } from "@/components/Showcase";
import { Manifesto } from "@/components/Manifesto";
import { SocialProof } from "@/components/SocialProof";
import { Pricing } from "@/components/Pricing";
import { PrincipleTicker } from "@/components/PrincipleTicker";
import { FAQ } from "@/components/FAQ";
import { Newsletter } from "@/components/Newsletter";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { StickyCTA } from "@/components/StickyCTA";

export default function LandingPage({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);

  return (
    <>
      <Header dict={dict} lang={lang} />
      <main id="main" role="main" className="min-h-screen bg-cream text-ink">
        <Hero dict={dict} />
        <TrustBlock dict={dict} />
        <Personalities dict={dict} />
        <Evolution dict={dict} />
        <Features dict={dict} />
        <Showcase dict={dict} />
        <SocialProof dict={dict} />
        <Manifesto dict={dict} />
        <Pricing dict={dict} />
        <PrincipleTicker dict={dict} />
        <FAQ dict={dict} />
        <Newsletter dict={dict} />
        <CTA dict={dict} />
      </main>
      <Footer dict={dict} lang={lang} />
      <StickyCTA dict={dict} />
    </>
  );
}
