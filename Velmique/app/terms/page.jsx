export default function TermsPage() {
  const sections = [
    {
      title: 'Acceptance of Terms',
      content: 'By accessing and using the Velmique website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this website.',
    },
    {
      title: 'Use of the Website',
      content: 'You may use this website for lawful purposes only. You must not misuse the website by knowingly introducing viruses, trojans, worms, logic bombs or other material that is malicious or technologically harmful. You must not attempt to gain unauthorised access to this website, the server on which it is stored or any server, computer or database connected to it.',
    },
    {
      title: 'Product Descriptions',
      content: 'We have made every effort to display as accurately as possible the colors, images, and details of our products. We cannot guarantee that your computer monitor\'s display of any color will be accurate. We reserve the right to limit quantities and to refuse or cancel any order.',
    },
    {
      title: 'Pricing & Payment',
      content: 'All prices are listed in the applicable currency and are subject to change without notice. We reserve the right to correct any pricing errors. Payment must be received before orders are dispatched. Fraudulent or suspicious transactions will be cancelled and reported to relevant authorities.',
    },
    {
      title: 'Intellectual Property',
      content: 'All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Velmique and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.',
    },
    {
      title: 'Limitation of Liability',
      content: 'To the fullest extent permitted by law, Velmique shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.',
    },
    {
      title: 'Governing Law',
      content: 'These terms shall be governed by and construed in accordance with the laws of France, without regard to its conflict of law provisions. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Paris, France.',
    },
  ];

  return (
    <div className="pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        <div className="mb-12">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Legal</p>
          <h1 className="font-serif text-4xl text-[#f3ede0]">Terms & Conditions</h1>
          <div className="gold-divider w-16 mt-4" />
          <p className="text-[#f3ede0]/40 text-xs font-body mt-4">Last updated: March 1, 2026</p>
        </div>

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="font-serif text-xl text-[#f3ede0] mb-3">{i + 1}. {s.title}</h2>
              <div className="gold-divider w-10 mb-4" />
              <p className="text-[#f3ede0]/55 font-body text-sm leading-loose">{s.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
