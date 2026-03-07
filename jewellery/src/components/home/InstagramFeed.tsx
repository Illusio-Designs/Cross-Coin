import Image from 'next/image'
import { Instagram } from 'lucide-react'

const instagramPosts = [
  { id: 1, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400' },
  { id: 2, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400' },
  { id: 3, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400' },
  { id: 4, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400' },
  { id: 5, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400' },
  { id: 6, image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400' },
]

export default function InstagramFeed() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Instagram size={32} className="text-gold" />
            <h2 className="text-4xl font-serif font-bold">@luxuryjewellery</h2>
          </div>
          <p className="text-muted text-lg">Follow us for daily inspiration</p>
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
                <Instagram size={32} className="text-gold" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
