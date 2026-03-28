import InstagramGallery from '../components/common/InstagramGallery';
import ReelsShowcase from '../components/common/ReelsShowcase';

export default function ProductTestPage() {
  return (
    <div style={{ width: '100%', padding: '32px 24px 64px', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>Instagram Gallery</h2>
        <InstagramGallery />
      </div>

      <div>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>Reels</h2>
        <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000' }}>
          <ReelsShowcase />
        </div>
      </div>
    </div>
  );
}
