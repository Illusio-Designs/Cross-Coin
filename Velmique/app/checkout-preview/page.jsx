import PackCheckoutPreview from './PackCheckoutPreview';

export const metadata = {
  title: 'Shiprocket Pack Preview',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function PreviewPage() {
  return <PackCheckoutPreview />;
}
