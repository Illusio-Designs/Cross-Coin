export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: 'Information We Collect',
      content: `We collect information you provide directly to us, such as when you create an account, place an order, or contact us. This includes your name, email address, postal address, phone number, and payment information.\n\nWe also automatically collect certain information when you use our website, including your IP address, browser type, pages viewed, and time spent on our site.`,
    },
    {
      title: 'How We Use Your Information',
      content: `We use the information we collect to process orders and send related information, including purchase confirmations and invoices; to send promotional communications, such as information about products, services, and events, from Velmique; to personalize your experience on our website; and to monitor and analyze trends, usage, and activities in connection with our services.`,
    },
    {
      title: 'Sharing of Information',
      content: `We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this policy. We may share your information with third-party vendors and service providers that perform services on our behalf, such as payment processing, shipping, and email delivery.`,
    },
    {
      title: 'Cookies',
      content: `We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our website may not function properly without cookies.`,
    },
    {
      title: 'Data Security',
      content: `We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. All transactions are processed through SSL encryption and our payment processors are PCI-DSS compliant.`,
    },
    {
      title: 'Your Rights',
      content: `You have the right to access, update, or delete your personal information at any time through your account settings. You may also contact us directly to request deletion of your data. We will respond to all requests within 30 days.`,
    },
    {
      title: 'Contact Us',
      content: `If you have any questions about this Privacy Policy, please contact us at privacy@velmique.com or by writing to Velmique, 12 Rue du Faubourg, Paris, France.`,
    },
  ];

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-12">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Legal</p>
          <h1 className="font-serif text-4xl text-cream">Privacy Policy</h1>
          <div className="gold-divider w-16 mt-4" />
          <p className="text-cream/40 text-xs font-body mt-4">Last updated: March 1, 2026</p>
        </div>

        <p className="text-cream/60 font-body text-sm leading-loose mb-10">
          At Velmique, your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.
        </p>

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="font-serif text-xl text-cream mb-3">{i + 1}. {s.title}</h2>
              <div className="gold-divider w-10 mb-4" />
              {s.content.split('\n\n').map((para, j) => (
                <p key={j} className="text-cream/55 font-body text-sm leading-loose mb-3">{para}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
