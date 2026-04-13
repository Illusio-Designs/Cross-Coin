import Image from 'next/image';

const UGC_IMAGES = [
{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', alt: 'Customer wearing Allbirds on a trail' },
{ url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80', alt: 'Customer wearing Allbirds in the city' },
{ url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80', alt: 'Customer wearing Allbirds at the park' },
{ url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', alt: 'Customer wearing Allbirds running' },
{ url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', alt: 'Customer wearing Allbirds at work' },
{ url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80', alt: 'Customer wearing Allbirds outdoors' }];


export function InstagramStrip() {
  return (
    <section className="mb-2 bg-white py-10 md:py-14">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-gray-600">
        Follow us @allbirds
      </p>
      <h2 className="mb-8 text-center font-display text-3xl font-normal text-brand-black">
        #WearAllbirds
      </h2>
      <div className="grid grid-cols-3 gap-2 px-4 md:grid-cols-6 md:px-6">
        {UGC_IMAGES.map((img, i) =>
        <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            <Image
            src={img.url}
            alt={img.alt}
            fill
            sizes="(max-width: 768px) 33vw, 16vw"
            className="object-cover transition-transform duration-300 hover:scale-105" />
          
          </div>
        )}
      </div>
    </section>);

}