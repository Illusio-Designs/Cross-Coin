import Home from "./home";
import { useEffect } from 'react';

export default function MainPage() {
  useEffect(() => {
    document.title = 'Cross Coin';
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/crosscoin icon.png';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return <Home />;
} 