import PageHeader from '@/components/layout/PageHeader';

export default function TermsPage() {
  const sections = [
    { title: 'Acceptance of Terms', content: 'By accessing and using the Velmique website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this website.' },
    { title: 'Use of the Website', content: 'You may use this website for lawful purposes only. You must not misuse the website by knowingly introducing viruses, trojans, worms, logic bombs or other material that is malicious or technologically harmful. You must not attempt to gain unauthorised access to this website, the server on which it is stored or any server, computer or database connected to it.' },
    { title: 'Product Descriptions', content: 'We have made every effort to display as accurately as possible the colors, images, and details of our products. We cannot guarantee that your computer monitor\'s display of any color will be accurate. We reserve the right to limit quantities and to refuse or cancel any order.' },
    { title: 'Pricing & Payment', content: 'All prices are listed in the applicable currency and are subject to change without notice. We reserve the right to correct any pricing errors. Payment must be received before orders are dispatched. Fraudulent or suspicious transactions will be cancelled and reported to relevant authorities.' },
    { title: 'Intellectual Property', content: 'All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Velmique and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.' },
    { title: 'Limitation of Liability', content: 'To the fullest extent permitted by law, Velmique shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.' },
    { title: 'Governing Law', content: 'These terms shall be governed by and construed in accordance with the laws of France, without regard to its conflict of law provisions. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Paris, France.' },
  ];

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Legal"
        title="TERMS &"
        accent="CONDITIONS"
        intro="Last updated: March 1, 2026. Please read these terms carefully — they govern your use of the Velmique website and services."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <aside className="md:col-span-4">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">Sections</p>
            <ol className="space-y-2 text-sm font-body">
              {sections.map((s, i) => (
                <li key={s.title} className="text-[var(--ink-soft)]">
                  <span className="font-serif italic text-[var(--gold-deep)] mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </li>
              ))}
            </ol>
          </aside>

          <div className="md:col-span-8 space-y-12">
            {sections.map((s, i) => (
              <section key={s.title}>
                <p className="font-display text-[var(--gold)] text-4xl leading-none mb-3">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="font-serif italic text-[var(--ink)] text-2xl mb-4">{s.title}</h2>
                <p className="text-[var(--ink-soft)] font-body text-base leading-loose">{s.content}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
