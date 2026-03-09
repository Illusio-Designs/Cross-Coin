import HeroSection from '@/components/home/HeroSection'
import FeaturedCollections from '@/components/home/FeaturedCollections'
import BestSellers from '@/components/home/BestSellers'
import BenefitsSection from '@/components/home/BenefitsSection'
import ProductShowcase from '@/components/home/ProductShowcase'
import ShopByCategory from '@/components/home/ShopByCategory'
import Testimonials from '@/components/home/Testimonials'
import InstagramFeed from '@/components/home/InstagramFeed'
import Newsletter from '@/components/home/Newsletter'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedCollections />
      <BestSellers />
      <BenefitsSection />
      <ProductShowcase />
      <ShopByCategory />
      <Testimonials />
      <InstagramFeed />
      <Newsletter />
    </>
  )
}
