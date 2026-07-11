import Link from 'next/link';
import Icon from '@/components/Icon';

const COLS = [
  { title: 'Catalog', links: ['Running', 'Athletic', 'Compression', 'No-Show', 'Lifestyle', 'All socks'] },
  { title: 'For buyers', links: ['Delivery & payment', 'Returns & exchange', 'Size guide', 'Loyalty program', 'FAQ'] },
  { title: 'Company', links: ['About', 'Technology', 'Blog', 'Careers', 'Contact'] },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cols">
          <div className="brand-col">
            <div className="logo-mark" style={{ fontSize: 24 }}><span className="m">M</span><span className="rest">orbix</span></div>
            <p>Premium socks for sport and city life. Technology, comfort and clean design in every step.</p>
            <div className="socials">
              <a href="#" aria-label="Instagram"><Icon name="Instagram" size={18} /></a>
              <a href="#" aria-label="Facebook"><Icon name="Facebook" size={18} /></a>
              <a href="#" aria-label="YouTube"><Icon name="Youtube" size={18} /></a>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>{col.links.map((l) => <li key={l}><Link href="#">{l}</Link></li>)}</ul>
            </div>
          ))}

          <div>
            <h4>Contacts</h4>
            <ul>
              <li><Link href="#"><Icon name="Phone" size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 8 }} />+1 800 123-45-67</Link></li>
              <li><Link href="#"><Icon name="Mail" size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 8 }} />info@morbixsocks.com</Link></li>
              <li><span style={{ fontSize: 14, opacity: .82 }}><Icon name="Clock" size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 8 }} />Daily 9:00 – 21:00</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Morbix. All rights reserved.</span>
          <span style={{ display: 'flex', gap: 20 }}>
            <Link href="#">Privacy policy</Link>
            <Link href="#">Terms of service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
