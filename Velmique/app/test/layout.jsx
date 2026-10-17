import './mint.css';
import MintShell from './MintShell';

export const metadata = {
  title: 'Velmique — Maison de Parfum',
  description: 'VELMIQUE — refined, handcrafted Indian fragrances. Maison de Parfum.',
};

export default function TestLayout({ children }) {
  return (
    <div className="m-root">
      <MintShell>{children}</MintShell>
    </div>
  );
}
