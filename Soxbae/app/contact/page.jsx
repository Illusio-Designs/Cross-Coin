import Icon from '@/components/Icon';

export const metadata = { title: 'Contact' };

const DETAILS = [
  { icon: 'Phone', label: 'Phone', value: '+91 97128 91700' },
  { icon: 'Mail', label: 'Email', value: 'support@soxbaesocks.com' },
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

        <form className="contact-form" action="#" method="post">
          <div className="field-row">
            <label>Name<input type="text" name="name" placeholder="Your name" required /></label>
            <label>Email<input type="email" name="email" placeholder="you@email.com" required /></label>
          </div>
          <label>Message<textarea name="message" rows={5} placeholder="How can we help?" required /></label>
          <button type="submit" className="btn btn-primary">Send message <Icon name="Send" size={16} /></button>
        </form>
      </div>
    </div>
  );
}
