import Image from 'next/image'
import { Instagram } from 'lucide-react'

const instagramPosts = [
  { id: 1, image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400' },
  { id: 2, image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400' },
  { id: 3, image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400' },
  { id: 4, image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=400' },
  { id: 5, image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400' },
  { id: 6, image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400' },
]

export default function InstagramFeed() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Instagram size={32} />
            <h2 className="text-4xl font-bold">@premiumsocks</h2>
          </div>
          <p className="text-muted text-lg">Follow us for style inspiration</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {instagramPosts.map((post) => (
            <a
              key={post.id}
              href="#"
              className="group relative aspect-square overflow-hidden"
            >
              <Image
                src={post.image}
                alt={`Instagram post ${post.id}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram size={32} className="text-white" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
