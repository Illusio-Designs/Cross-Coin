// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import WebsiteShell from '../../components/website/WebsiteShell';

// Dashboard view "blogs" → Website › Blog (components/website).
export function Blogs() {
  return <WebsiteShell tab="blog" />;
}
