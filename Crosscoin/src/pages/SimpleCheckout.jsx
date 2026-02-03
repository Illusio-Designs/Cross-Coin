import { useEffect } from 'react';
import { useRouter } from 'next/router';

// PERMANENT FIX: This handles any cached references to SimpleCheckout
export default function SimpleCheckout() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to UnifiedCheckout
    router.replace('/UnifiedCheckout');
  }, [router]);

  // Return null while redirecting
  return null;
}