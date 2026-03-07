import Image from 'next/image'

export const metadata = {
  title: 'About Us - Premium Socks',
  description: 'Learn about our story and commitment to quality',
}

export default function AboutPage() {
  return (
    <div className="container-custom py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 text-center">About Premium Socks</h1>
        
        <div className="relative aspect-[16/9] mb-12">
          <Image
            src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200"
            alt="About us"
            fill
            className="object-cover"
          />
        </div>

        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-xl text-muted">
            Founded in 2020, Premium Socks was born from a simple belief: everyone deserves
            comfortable, high-quality socks that last.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Our Story</h2>
          <p>
            What started as a small passion project has grown into a trusted brand serving
            thousands of customers worldwide. We're committed to creating socks that combine
            comfort, durability, and style.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Our Values</h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">✓</span>
              <div>
                <strong>Quality First:</strong> We use only premium materials and rigorous
                quality control.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">✓</span>
              <div>
                <strong>Sustainability:</strong> Committed to eco-friendly practices and
                materials.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">✓</span>
              <div>
                <strong>Customer Satisfaction:</strong> Your comfort and happiness are our
                top priorities.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">✓</span>
              <div>
                <strong>Innovation:</strong> Constantly improving our products with the
                latest technology.
              </div>
            </li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Why Choose Us</h2>
          <p>
            Every pair of socks we create goes through extensive testing to ensure maximum
            comfort and durability. From the cotton fields to your feet, we oversee every
            step of the process to deliver the best possible product.
          </p>
        </div>
      </div>
    </div>
  )
}
