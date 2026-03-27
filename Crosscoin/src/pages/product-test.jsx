import InstagramGallery from '../components/common/InstagramGallery';
import LookbookShowcase from '../components/common/LookbookShowcase';
import ReelsShowcase from '../components/common/ReelsShowcase';

export default function ProductTestPage() {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Instagram Gallery Test</h3>
        <InstagramGallery />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Lookbook Test</h3>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 12 }}>
          <LookbookShowcase embedded />
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Reels Test</h3>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#000', padding: 12 }}>
          <ReelsShowcase />
        </div>
      </div>
    </div>
  );
}
