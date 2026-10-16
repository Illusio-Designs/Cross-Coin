import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, toast } from '../../components/test/ui';

export default function TestContact() {
  const router = useRouter();
  return (
    <TestLayout>
      <Head><title>Contact — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Contact</div>
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
      </div>
    </TestLayout>
  );
}
