import Link from 'next/link';

const categories = [
  {
    name: 'Sports',
    description: 'Professional athletic grips',
    link: '/sports',
  },
  {
    name: 'Gaming',
    description: 'Enhanced gaming performance',
    link: '/gaming',
  },
  {
    name: 'Tools',
    description: 'Industrial grip solutions',
    link: '/tools',
  },
];

export default function Categories() {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-black mb-4">
            CATEGORIES
          </h2>
          <div className="w-24 h-1 bg-black mx-auto mb-6"></div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our specialized grip solutions designed for different applications
          </p>
        </div>

        {/* Different Layout - Horizontal cards */}
        <div className="space-y-8">
          {categories.map((category, index) => (
            <Link 
              key={index}
              href={category.link}
              className={`group block ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} flex flex-col lg:flex items-center bg-white shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden`}
            >
              {/* Image Section */}
              <div className="w-full lg:w-1/2 aspect-[16/9] lg:aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl lg:text-8xl font-display font-black text-white/20">
                    {category.name.charAt(0)}
                  </div>
                </div>
                {/* Geometric overlay */}
                <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white/30 group-hover:rotate-45 transition-transform duration-500"></div>
              </div>

              {/* Content Section */}
              <div className="w-full lg:w-1/2 p-8 lg:p-12">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-black mr-4 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-display font-black text-gray-900 group-hover:text-gray-600 transition-colors">
                    {category.name}
                  </h3>
                </div>
                
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  {category.description}
                </p>
                
                <div className="flex items-center text-black font-medium group-hover:text-gray-600 transition-colors">
                  <span className="mr-3 uppercase tracking-wider text-sm">Explore Category</span>
                  <div className="w-8 h-px bg-black group-hover:w-12 transition-all duration-300"></div>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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