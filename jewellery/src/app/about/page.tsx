import Image from 'next/image'

export const metadata = {
  title: 'About Us - Luxury Jewellery',
  description: 'Learn about our heritage and commitment to excellence',
}

export default function AboutPage() {
  return (
    <div className="container-custom py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-serif font-bold mb-8 text-center">Our Story</h1>
        
        <div className="relative aspect-[16/9] mb-12">
          <Image
            src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200"
            alt="About us"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 border-4 border-gold/30" />
        </div>

        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-xl text-muted">
            Since 1985, Luxury Jewellery has been crafting exquisite pieces that celebrate
            life's most precious moments. Our commitment to excellence and timeless elegance
            has made us a trusted name in fine jewelry.
          </p>

          <h2 className="text-3xl font-serif font-bold mt-12 mb-4">Our Heritage</h2>
          <p>
            Founded by master jeweler Alessandro Romano, our atelier combines traditional
            craftsmanship with contemporary design. Each piece is meticulously handcrafted
            using ethically sourced materials and the finest gemstones.
          </p>

          <h2 className="text-3xl font-serif font-bold mt-12 mb-4">Our Values</h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-gold mt-1">✓</span>
              <div>
                <strong>Excellence:</strong> We maintain the highest standards in every piece
                we create.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold mt-1">✓</span>
              <div>
                <strong>Sustainability:</strong> Committed to ethical sourcing and
                environmental responsibility.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold mt-1">✓</span>
              <div>
                <strong>Craftsmanship:</strong> Every piece is handcrafted by skilled
                artisans with decades of experience.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold mt-1">✓</span>
              <div>
                <strong>Trust:</strong> Building lasting relationships with our clients
                through transparency and integrity.
              </div>
            </li>
          </ul>

          <h2 className="text-3xl font-serif font-bold mt-12 mb-4">Why Choose Us</h2>
          <p>
            Every piece in our collection tells a story. From engagement rings that symbolize
            eternal love to statement necklaces that capture timeless elegance, we create
            jewelry that becomes part of your legacy. Our master jewelers oversee every step
            of the process, ensuring that each piece meets our exacting standards.
          </p>
        </div>
      </div>
    </div>
  )
}
