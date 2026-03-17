import React from 'react';
import { useRouter } from 'next/router';
import ProductDetailsTest from '../components/products/ProductDetailsTest';

const ProductTestPage = () => {
  const router = useRouter();
  
  return <ProductDetailsTest />;
};

export default ProductTestPage;
