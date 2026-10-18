import './mint.css';
import MintShell from './MintShell';
import WhatsAppChat from '@/components/ui/WhatsAppChat';
import ScrollToTop from '@/components/ui/ScrollToTop';

export const metadata = {
  title: 'Velmique — Maison de Parfum',
  description: 'VELMIQUE — refined, handcrafted Indian fragrances. Maison de Parfum.',
};

export default function TestLayout({ children }) {
  return (
    <div className="m-root">
      <MintShell>{children}</MintShell>
      <WhatsAppChat />
      <ScrollToTop />
    </div>
  );
}
