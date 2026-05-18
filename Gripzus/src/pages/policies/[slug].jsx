import Head from 'next/head';
import { useRouter } from 'next/router';
import PageHero from '../../components/common/PageHero';

const POLICIES = {
  'privacy-policy': {
    title: 'Privacy',
    accent: 'policy',
    eyebrow: 'Legal',
    intro: 'How we collect, use and protect your personal information when you shop with Gripzus.',
    sections: [
      { h: 'Information we collect', p: 'When you make a purchase or create an account, we collect your name, email, phone number, billing and shipping address. We never store full payment-card details on our servers.' },
      { h: 'How we use it', p: 'We use your details to fulfil orders, send order updates, and (with your consent) the occasional Inner Sole newsletter. We do not sell or rent your data.' },
      { h: 'Cookies', p: 'We use essential cookies to keep your cart and session working, and analytics cookies (anonymised) to understand which pages people read. You can decline non-essential cookies via the banner.' },
      { h: 'Your rights', p: 'You can request a copy of the data we hold, ask us to correct it, or ask us to delete it. Email privacy@gripzus.com and we will respond within 30 days.' },
    ],
  },
  'terms-and-conditions': {
    title: 'Terms',
    accent: 'of use',
    eyebrow: 'Legal',
    intro: 'The rules of the road for using gripzus.com — short, plain, fair.',
    sections: [
      { h: 'Acceptance', p: 'By visiting our site, placing an order, or creating an account, you agree to these terms.' },
      { h: 'Products and pricing', p: 'All prices are in INR and inclusive of GST unless stated. Stock can change; we reserve the right to limit quantities or cancel orders in case of pricing errors.' },
      { h: 'Intellectual property', p: 'All photography, copy, logos and patterns on this site are the property of Gripzus and may not be reused without permission.' },
      { h: 'Limitation of liability', p: 'We are responsible for the pair on your foot. We are not responsible for any indirect, incidental or consequential loss.' },
    ],
  },
  'shipping-policy': {
    title: 'Shipping',
    accent: 'policy',
    eyebrow: 'Care',
    intro: 'How your Gripzus pair gets to you — timelines, fees, and what to expect.',
    sections: [
      { h: 'Where we ship', p: 'India-wide. International coming soon — join the Inner Sole to hear first.' },
      { h: 'Timelines', p: 'Standard delivery is 2–4 business days in metros and 4–7 days elsewhere. Express delivery is available at checkout for select PIN codes.' },
      { h: 'Free shipping', p: 'Orders over ₹999 ship free. Below that, ₹49 is added for standard delivery.' },
      { h: 'Tracking', p: 'You receive a tracking link by email and SMS the moment your order leaves our atelier.' },
    ],
  },
  'cancellation-and-refund': {
    title: 'Cancellation',
    accent: '& refund',
    eyebrow: 'Care',
    intro: 'You can cancel any order before it ships, and return any pair within 30 days. No questions, no restocking fee.',
    sections: [
      { h: 'Cancelling an order', p: 'Head to your account → orders → cancel. If we have not shipped yet, the cancellation is instant and a full refund is initiated.' },
      { h: 'Returns', p: 'Send back any unworn pair within 30 days of delivery. Pop the prepaid label on the original box and drop it at any partner courier — we email you the label on request.' },
      { h: 'Refund timeline', p: 'Once the return reaches us, the refund is processed within 3 business days and shows up in your account in 5–7 days depending on your bank.' },
      { h: 'Exchanges', p: 'We do not do direct exchanges. Place a new order for the colour or size you want and return the original.' },
    ],
  },
};

export default function PolicyPage() {
  const { query } = useRouter();
  const policy = POLICIES[query.slug];

  if (!policy) {
    // Default fallback while routing is hydrating
    return (
      <>
        <main className="bg-paper min-h-screen flex items-center justify-center">
          <p className="text-ink-muted text-xs tracking-[0.3em] uppercase">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Head><title>{policy.title} {policy.accent} — Gripzus</title></Head>
      <main className="bg-paper">
        <PageHero eyebrow={policy.eyebrow} title={policy.title} accent={policy.accent} intro={policy.intro} />

        <div className="wrap">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24">
            {policy.sections.map((s, i) => (
              <section key={i} className={`grid grid-cols-12 gap-4 md:gap-8 ${i > 0 ? 'mt-12 pt-12 border-t border-line' : ''}`}>
                <div className="col-span-12 md:col-span-3">
                  <span className="eyebrow text-clay">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="col-span-12 md:col-span-9">
                  <h2 className="font-display uppercase text-ink text-xl md:text-2xl tracking-[-0.02em] mb-3" style={{ fontWeight: 700 }}>{s.h}</h2>
                  <p className="prose-body text-base text-justify">{s.p}</p>
                </div>
              </section>
            ))}

            <p className="eyebrow mt-16 pt-8 border-t border-line text-justify">
              Updated · May 2026 — questions? <a href="mailto:support@gripzus.com" className="text-clay-deep underline underline-offset-4 hover:text-ink">support@gripzus.com</a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

export function getStaticPaths() {
  return {
    paths: Object.keys(POLICIES).map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}
export function getStaticProps() {
  return { props: {} };
}
