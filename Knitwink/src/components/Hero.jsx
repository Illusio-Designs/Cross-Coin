import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-black rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-6 lg:space-y-8 z-10">
            <div className="inline-block">
              <span className="text-xs lg:text-sm font-medium tracking-[0.3em] text-gray-600 uppercase">
                New Collection 2026
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-display font-black leading-tight">
              LUXURY
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                IN EVERY
              </span>
              <br />
              STEP
            </h1>

            <p className="text-base lg:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
              Experience unparalleled comfort and style with our premium collection of handcrafted socks. 
              Where luxury meets everyday elegance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link 
                href="/shop"
                className="px-8 py-4 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-all duration-300 hover:scale-105 text-center"
              >
                SHOP NOW
              </Link>
              <Link 
                href="/collections"
                className="px-8 py-4 bg-white text-black font-medium rounded-full border-2 border-black hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 text-center"
              >
                VIEW COLLECTIONS
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 lg:pt-12">
              <div>
                <div className="text-3xl lg:text-4xl font-bold">500+</div>
                <div className="text-xs lg:text-sm text-gray-600 mt-1">Products</div>
              </div>
              <div>
                <div className="text-3xl lg:text-4xl font-bold">50K+</div>
                <div className="text-xs lg:text-sm text-gray-600 mt-1">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl lg:text-4xl font-bold">4.9★</div>
                <div className="text-xs lg:text-sm text-gray-600 mt-1">Rating</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative z-10">
            <div className="relative aspect-[3/4] lg:aspect-[4/5] rounded-3xl overflow-hidden bg-gray-200 shadow-2xl">
              {/* Placeholder for hero image */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                <div className="text-center p-8">
                  <div className="text-6xl lg:text-8xl font-display font-black text-white/20 mb-4">
                    K
                  </div>
                  <p className="text-white/60 text-sm">Hero Image Placeholder</p>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 lg:-left-12 bg-white rounded-2xl shadow-xl p-6 lg:p-8">
              <div className="text-xs text-gray-600 mb-1">Premium Quality</div>
              <div className="text-2xl lg:text-3xl font-bold">100%</div>
              <div className="text-xs text-gray-600">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden lg:block">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
