import Icon from '@/components/Icon';
import ContactForm from '@/components/contact/ContactForm';

export const metadata = { title: 'Contact' };

const DETAILS = [
  { icon: 'Phone', label: 'Phone', value: '+91 97128 91700' },
  { icon: 'Mail', label: 'Email', value: 'obzusindia@gmail.com' },
  { icon: 'MapPin', label: 'Address', value: 'Royal Plaza, Panchasar Road, Morbi - 363641, Gujarat, India' },
  { icon: 'Clock', label: 'Hours', value: 'Mon – Sat, 9:00 – 21:00' },
];

export default function ContactPage() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero">
        <span className="eyebrow">Contact</span>
        <h1>Get in touch</h1>
        <p>Questions about sizing, an order or a return? Our team is here every day.</p>
      </div>

      <div className="contact-layout">
        <div className="contact-details">
          {DETAILS.map((d) => (
            <div className="contact-detail" key={d.label}>
              <span className="ic"><Icon name={d.icon} size={18} /></span>
              <div><span className="muted">{d.label}</span><b>{d.value}</b></div>
            </div>
          ))}
        </div>

        <ContactForm />
      </div>

      <div id="grievance" style={{ maxWidth: 760, margin: '40px auto 0', padding: '28px 24px', border: '1px solid rgba(0,0,0,.14)', scrollMarginTop: 110 }}>
        <h3 style={{ fontSize: 20, margin: '0 0 12px', fontWeight: 600 }}>Grievance Officer</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 16px', opacity: 0.8 }}>
          For privacy requests — access, correction, deletion, or withdrawing consent — or any grievance
          about how your personal data is handled, contact our Grievance Officer. We respond within the
          timelines required under the DPDP Act, 2023.
        </p>
        <div style={{ fontSize: 14, lineHeight: 1.9 }}>
          <div><span style={{ opacity: 0.6 }}>Name:</span> Divyesh Kotadiya</div>
          <div><span style={{ opacity: 0.6 }}>Entity:</span> Obzus India Private Limited</div>
          <div><span style={{ opacity: 0.6 }}>Email:</span> <a href="mailto:obzusindia@gmail.com">obzusindia@gmail.com</a></div>
          <div><span style={{ opacity: 0.6 }}>Phone:</span> <a href="tel:+919712891700">+91 97128 91700</a></div>
        </div>
      </div>
    </div>
  );
}
