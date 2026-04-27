import PageHeader from '@/components/layout/PageHeader';

export default function PrivacyPolicyPage() {
  const sections = [
    { title: 'Information We Collect', content: 'We collect information you provide directly to us, such as when you create an account, place an order, or contact us. This includes your name, email address, postal address, phone number, and payment information.\n\nWe also automatically collect certain information when you use our website, including your IP address, browser type, pages viewed, and time spent on our site.' },
    { title: 'How We Use Your Information', content: 'We use the information we collect to process orders and send related information, including purchase confirmations and invoices; to send promotional communications, such as information about products, services, and events, from Velmique; to personalize your experience on our website; and to monitor and analyze trends, usage, and activities in connection with our services.' },
    { title: 'Sharing of Information', content: 'We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this policy. We may share your information with third-party vendors and service providers that perform services on our behalf, such as payment processing, shipping, and email delivery.' },
    { title: 'Cookies', content: 'We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our website may not function properly without cookies.' },
    { title: 'Data Security', content: 'We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. All transactions are processed through SSL encryption and our payment processors are PCI-DSS compliant.' },
    { title: 'Your Rights', content: 'You have the right to access, update, or delete your personal information at any time through your account settings. You may also contact us directly to request deletion of your data. We will respond to all requests within 30 days.' },
    { title: 'Contact Us', content: 'If you have any questions about this Privacy Policy, please contact us at privacy@velmique.com or by writing to Velmique, 12 Rue du Faubourg, Paris, France.' },
  ];

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Legal"
        title="PRIVACY"
        accent="POLICY"
        intro="Last updated: March 1, 2026. At Velmique, your privacy is important to us. This policy explains how we collect, use, and safeguard your information."
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
                {s.content.split('\n\n').map((para, j) => (
                  <p key={j} className="text-[var(--ink-soft)] font-body text-base leading-loose mb-3">{para}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
