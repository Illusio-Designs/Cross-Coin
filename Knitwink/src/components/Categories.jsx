import Link from 'next/link';

const categories = [
  {
    name: 'Men',
    description: 'Premium comfort for everyday',
    link: '/men',
  },
  {
    name: 'Women',
    description: 'Elegant designs, superior quality',
    link: '/women',
  },
  {
    name: 'Sports',
    description: 'Performance meets style',
    link: '/sports',
  },
];

export default function Categories() {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {categories.map((category, index) => (
            <Link 
              key={index}
              href={category.link}
              className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 hover:shadow-2xl transition-all duration-500"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500"></div>
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-10">
                <h3 className="text-4xl lg:text-5xl font-display font-black text-white mb-2 group-hover:scale-105 transition-transform duration-300">
                  {category.name}
                </h3>
                <p className="text-white/90 text-sm lg:text-base mb-4">
                  {category.description}
                </p>
                <div className="flex items-center text-white font-medium">
                  <span className="mr-2">Shop Now</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
