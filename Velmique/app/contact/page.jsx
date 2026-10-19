import { seoMeta } from '@/lib/site';
import ContactForm from './ContactForm';

export const revalidate = 600;

export async function generateMetadata() {
  return seoMeta('contact', {
    title: 'Contact — Velmique',
    description: 'Questions about an order, a fragrance or gifting? Reach the VELMIQUE concierge by email, phone or WhatsApp.',
    path: '/contact',
  });
}

const INFO = [
  { label: 'Email', value: 'obzusindia@gmail.com', href: 'mailto:obzusindia@gmail.com' },
  { label: 'Phone / WhatsApp', value: '+91 97128 91700', href: 'tel:+919712891700' },
  { label: 'Address', value: 'Obzus India Private Limited, Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi — 363641, Gujarat, India', href: 'https://maps.google.com/?q=Royal+Plaza+Panchasar+Road+Morbi+363641' },
];

export default function MaisonContact() {
  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Get in touch</span>
        <h1>A Word with Velmique.</h1>
        <p>Stocking our fragrances, a gifting commission, or simply curious about a note — our concierge replies within 24 hours, Monday to Saturday.</p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-contact">
          <div>
            <span className="m-eyebrow">Reach us</span>
            <div className="m-infocard">
              {INFO.map((i) => (
                <div className="m-inforow" key={i.label}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg>
                  <div><small>{i.label}</small><a href={i.href} target={i.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ color: 'var(--m-ink)' }}>{i.value}</a></div>
                </div>
              ))}
            </div>
            <div className="m-infocard">
              <small style={{ display: 'block', fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--m-ink-faint)', marginBottom: 10 }}>Hours</small>
              <div className="m-sumrow" style={{ padding: '5px 0' }}><span>Mon – Fri</span><span>9:00 AM – 6:00 PM IST</span></div>
              <div className="m-sumrow" style={{ padding: '5px 0' }}><span>Saturday</span><span>10:00 AM – 4:00 PM IST</span></div>
              <div className="m-sumrow" style={{ padding: '5px 0' }}><span>Sunday</span><span>Closed</span></div>
            </div>
            {/* Grievance Officer — required by the DPDP Act 2023 and the
                Consumer Protection (E-Commerce) Rules 2020 (footer links here). */}
            <div className="m-infocard" id="grievance" style={{ scrollMarginTop: 110 }}>
              <small style={{ display: 'block', fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--m-ink-faint)', marginBottom: 10 }}>Grievance Officer</small>
              <p style={{ color: 'var(--m-ink-soft)', fontSize: 13.5, lineHeight: 1.7, marginBottom: 12 }}>For privacy requests — access, correction, deletion or withdrawing consent — or any grievance about how your personal data is handled. We respond within the timelines required under the DPDP Act, 2023.</p>
              <div className="m-sumrow" style={{ padding: '4px 0' }}><span>Name</span><span>Divyesh Kotadiya</span></div>
              <div className="m-sumrow" style={{ padding: '4px 0' }}><span>Entity</span><span>Obzus India Private Limited</span></div>
              <div className="m-sumrow" style={{ padding: '4px 0' }}><span>Email</span><a href="mailto:obzusindia@gmail.com">obzusindia@gmail.com</a></div>
              <div className="m-sumrow" style={{ padding: '4px 0' }}><span>Phone</span><a href="tel:+919712891700">+91 97128 91700</a></div>
            </div>
          </div>

          <div className="m-formcard">
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
