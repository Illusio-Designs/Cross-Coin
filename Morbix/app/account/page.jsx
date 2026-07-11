import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata = { title: 'Sign in' };

export default function AccountPage() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="auth-wrap">
        <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
          <span className="eyebrow">Account</span>
          <h1>Sign in to Morbix</h1>
          <p>Track orders, save favourites and check out faster.</p>
        </div>

        <form className="contact-form auth-form" action="#" method="post">
          <label>Email<input type="email" name="email" placeholder="you@email.com" required /></label>
          <label>Password<input type="password" name="password" placeholder="••••••••" required /></label>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Sign in <Icon name="ArrowRight" size={16} />
          </button>
          <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            New to Morbix? <Link href="#" style={{ color: 'var(--navy)', fontWeight: 600 }}>Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
