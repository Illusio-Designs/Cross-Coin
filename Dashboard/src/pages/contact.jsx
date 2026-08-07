import { useState } from 'react';
import Layout from '../components/site/Layout';
import { Mail, Phone, ArrowUpRight } from '../components/site/icons';
import styles from '../styles/site.module.css';

const CONTACT_EMAIL = 'Obzusindia@gmail.com';
const CONTACT_PHONE = '+91 97128 91700';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState(''); // '', 'sending', 'ok', 'err'
  const [note, setNote] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.message.trim() || (!form.email.trim() && !form.phone.trim())) {
      setStatus('err'); setNote('Add a message and an email or phone so we can reply.'); return;
    }
    setStatus('sending'); setNote('');
    try {
      const r = await fetch(`${API}/api/leads/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.success) { setStatus('ok'); setNote(d.message || 'Thanks — we\'ll get back to you soon.'); setForm({ name: '', email: '', phone: '', message: '' }); }
      else { setStatus('err'); setNote(d.message || 'Something went wrong. Please try again.'); }
    } catch { setStatus('err'); setNote('Something went wrong. Please try again.'); }
  };

  return (
    <Layout title="Contact" description="Get in touch with Obzus — partnerships, press and general enquiries.">
      <header className={styles.pageHero}>
        <p className={styles.eyebrow}>Contact</p>
        <h1 className={styles.pageTitle}>Let&apos;s talk.</h1>
        <p className={styles.pageLead}>
          Working with one of our brands, exploring a partnership, or just want to say hello?
          Send us a message and we&apos;ll get back to you.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.contactGrid}>
            {/* Contact form */}
            <div className={styles.contactCard}>
              <h3>Send us a message</h3>
              <p>We read everything and aim to reply within a couple of working days.</p>
              <form className={styles.cform} onSubmit={submit}>
                <div className={styles.cformRow}>
                  <div className={styles.cfield}>
                    <label htmlFor="c-name">Name</label>
                    <input id="c-name" className={styles.cinput} value={form.name} onChange={set('name')} placeholder="Your name" />
                  </div>
                  <div className={styles.cfield}>
                    <label htmlFor="c-phone">Phone</label>
                    <input id="c-phone" className={styles.cinput} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" inputMode="tel" />
                  </div>
                </div>
                <div className={styles.cfield}>
                  <label htmlFor="c-email">Email</label>
                  <input id="c-email" className={styles.cinput} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                </div>
                <div className={styles.cfield}>
                  <label htmlFor="c-msg">Message</label>
                  <textarea id="c-msg" className={styles.ctext} value={form.message} onChange={set('message')} placeholder="How can we help?"
                    required aria-required="true"
                    aria-invalid={status === 'err' && !form.message.trim() ? 'true' : undefined} />
                </div>
                <button className={styles.csubmit} type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send message'} <ArrowUpRight />
                </button>
                {/* Live region so screen readers hear sending / success / error. */}
                <div role="status" aria-live="polite">
                  {note && <p className={`${styles.cstatus} ${status === 'ok' ? styles.ok : status === 'err' ? styles.err : ''}`}>{note}</p>}
                </div>
              </form>
            </div>

            {/* Direct contact */}
            <div className={styles.contactBox}>
              <div className={styles.contactBoxInner}>
                <h3>Reach us directly</h3>
                <p>Prefer email or a call? We&apos;re here — Obzus India Pvt. Ltd., based in India.</p>
                <a className={styles.contactBtn} href={`mailto:${CONTACT_EMAIL}`} style={{ marginBottom: 12 }}>
                  <Mail /> {CONTACT_EMAIL}
                </a>
                <a className={styles.contactBtn} href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}>
                  <Phone /> {CONTACT_PHONE}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
