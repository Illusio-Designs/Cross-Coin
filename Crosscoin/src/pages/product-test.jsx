import {
  FomoContainer,
  StockCounter,
  ViewCounter,
  PurchaseCounter,
  TimerBadge,
  RatingBadge,
  DiscountBadge,
  UrgencyBanner,
  TrustBadge,
} from '../components/common/FomoElements';

export default function ProductTestPage() {
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 20 }}>FOMO Elements Preview</h2>
      <FomoContainer>
        <StockCounter stock={3} />
        <ViewCounter views={142} />
        <PurchaseCounter purchases={1280} />
        <TimerBadge expiresAt={expiresAt} />
        <RatingBadge rating={4.6} reviews={238} />
        <DiscountBadge originalPrice={999} salePrice={629} />
        <UrgencyBanner message="Limited time offer — ends soon!" type="warning" />
        <UrgencyBanner message="Free delivery on this order" type="success" />
        <TrustBadge text="Trusted by thousands of customers" icon="🛡️" />
      </FomoContainer>
    </div>
  );
} 