import Home from "./home";
import SeoWrapper from '../console/SeoWrapper';

// Load critical page CSS
import '../styles/pages/Home.css';

export default function MainPage() {
  return (
    <SeoWrapper pageName="home">
      <Home />
    </SeoWrapper>
  );
} 