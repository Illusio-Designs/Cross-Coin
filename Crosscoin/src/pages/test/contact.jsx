import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, toast } from '../../components/test/ui';

export default function TestContact({ preview = true }) {
  const router = useRouter();
  return (
    <TestLayout>
      {preview && <Head><title>Contact — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>}

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / Contact</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Get in touch</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 900 }}>
        <div className="contactgrid">
          <div>
            <div className="optlabel">Reach us</div>
            <div className="contactrow"><span className="pi">{I.truck(20)}</span><div><b>WhatsApp &amp; phone</b><a href="https://wa.me/917434834000" target="_blank" rel="noopener noreferrer">+91 74348 34000</a></div></div>
            <div className="contactrow"><span className="pi">{I.card(20)}</span><div><b>Email</b><a href="mailto:obzusindia@gmail.com">obzusindia@gmail.com</a></div></div>
            <div className="contactrow"><span className="pi">{I.shield(20)}</span><div><b>Office</b><span>Obzus India Private Limited, Royal Plaza, Panchasar Road, Morbi - 363641, Gujarat (India)</span></div></div>
            <div className="contactrow"><span className="pi">{I.ret(20)}</span><div><b>Support hours</b><span>Mon–Sat, 10am–6pm IST</span></div></div>
          </div>
          <form className="contactform" onSubmit={(e) => { e.preventDefault(); toast('Thanks — we&rsquo;ll get back to you'); e.currentTarget.reset(); }}>
            <div className="optlabel">Send a message</div>
            <div className="ffield"><label>Name</label><input required placeholder="Your name" /></div>
            <div className="ffield"><label>Email</label><input required type="email" placeholder="you@email.com" /></div>
            <div className="ffield"><label>Message</label><textarea required rows={4} placeholder="How can we help?" /></div>
            <button className="btn btn--crimson btn--block" type="submit">Send message</button>
          </form>
        </div>

        {/* Grievance officer (DPDP) */}
        <div className="wrap" id="grievance" style={{ maxWidth: 820, paddingBottom: 60, scrollMarginTop: 90 }}>
          <div className="grievance">
            <span className="eyebrow">Grievance &amp; data privacy</span>
            <h3>Grievance Officer</h3>
            <p>For complaints, data-privacy requests or escalations under the DPDP Act, contact our Grievance Officer. We acknowledge every request within 48 hours and resolve within the statutory timeline.</p>
            <dl className="grievance__dl">
              <div><dt>Officer</dt><dd>Grievance Officer, Obzus India Pvt. Ltd.</dd></div>
              <div><dt>Email</dt><dd>obzusindia@gmail.com</dd></div>
              <div><dt>Phone</dt><dd>+91 97128 91700</dd></div>
              <div><dt>Address</dt><dd>Survey No. 1288, Vajepar, Royal Plaza, Panchasar Road, Morbi 363641, Gujarat (India)</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </TestLayout>
  );
}
