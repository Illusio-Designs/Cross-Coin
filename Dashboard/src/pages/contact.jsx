import Layout from '../components/site/Layout';
import { Mail, Phone, ArrowUpRight } from '../components/site/icons';
import styles from '../styles/site.module.css';

const CONTACT_EMAIL = 'Obzusindia@gmail.com';
const CONTACT_PHONE = '+91 97128 91700';

export default function Contact() {
  return (
    <Layout title="Contact" description="Get in touch with Obzus — partnerships, press and general enquiries.">
      <header className={styles.pageHero}>
        <p className={styles.eyebrow}>Contact</p>
        <h1 className={styles.pageTitle}>Let&apos;s talk.</h1>
        <p className={styles.pageLead}>
          Working with one of our brands, exploring a partnership, or just want to say hello?
          We&apos;d love to hear from you.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.contactGrid}>
            <div className={styles.contactCard}>
              <h3>General &amp; partnerships</h3>
              <p>The quickest way to reach us is by email. We read everything and aim to reply within a couple of working days.</p>
              <a className={styles.contactLine} href={`mailto:${CONTACT_EMAIL}`}>
                <Mail /> {CONTACT_EMAIL}
              </a>
              <a className={styles.contactLine} style={{ marginTop: 12 }} href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}>
                <Phone /> {CONTACT_PHONE}
              </a>
              <p style={{ marginTop: 12, marginBottom: 0 }}>Obzus India Pvt. Ltd. · Based in India</p>
            </div>
            <div className={styles.contactBox}>
              <div className={styles.contactBoxInner}>
                <h3>Press &amp; media</h3>
                <p>For press enquiries, brand assets or interview requests, send us a note and we&apos;ll point you to the right brand.</p>
                <a className={styles.contactBtn} href={`mailto:${CONTACT_EMAIL}?subject=Press%20enquiry`}>Email us <ArrowUpRight /></a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
