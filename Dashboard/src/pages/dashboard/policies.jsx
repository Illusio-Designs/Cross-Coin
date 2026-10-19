// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import WebsiteShell from '../../components/website/WebsiteShell';

// Dashboard view "policies" → Website › Policies (components/website).
export function Policies() {
  return <WebsiteShell tab="policies" />;
}
