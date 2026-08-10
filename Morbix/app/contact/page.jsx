import Icon from '@/components/Icon';
import ContactForm from '@/components/contact/ContactForm';

export const metadata = { title: 'Contact' };

const DETAILS = [
  { icon: 'Phone', label: 'Phone', value: '+91 97128 91700' },
  { icon: 'Mail', label: 'Email', value: 'support@morbixsocks.com' },
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
    </div>
  );
}
