import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Geometric Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-black rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full blur-3xl"></div>
      </div>

      {/* Hexagonal Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Different Layout - Centered with side elements */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Top Badge */}
          <div className="inline-block mb-6">
            <span className="text-xs lg:text-sm font-medium tracking-[0.3em] text-gray-600 uppercase bg-white/80 px-6 py-3 rounded-full shadow-lg border border-gray-200">
              🎯 Ultimate Grip Solutions 2026
            </span>
          </div>
          
          {/* Main Title - Smaller fonts */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-black leading-tight mb-6">
            <div className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                GRIP
              </span>
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-black rounded-full"></div>
            </div>
            <br />
            <div className="relative inline-block">
              <span className="text-black">THE FUTURE</span>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gray-300 rounded-full"></div>
            </div>
          </h1>

          {/* Description */}
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Experience unmatched control and performance with our revolutionary grip technology. 
            Where innovation meets precision in every grip solution.
          </p>

          {/* Buttons - Horizontal layout */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link 
              href="/shop"
              className="group px-10 py-5 bg-black text-white font-medium rounded-none hover:bg-gray-800 transition-all duration-300 text-center relative overflow-hidden"
            >
              <span className="relative z-10">SHOP NOW</span>
              <div className="absolute inset-0 bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            </Link>
            <Link 
              href="/collections"
              className="group px-10 py-5 bg-white text-black font-medium rounded-none border-2 border-black hover:bg-black hover:text-white transition-all duration-300 text-center"
            >
              VIEW COLLECTIONS
            </Link>
          </div>

          {/* Stats - Different arrangement */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-6 border border-gray-200 shadow-lg">
              <div className="text-3xl lg:text-4xl font-bold text-black mb-2">200+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Grip Solutions</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 border border-gray-200 shadow-lg">
              <div className="text-3xl lg:text-4xl font-bold text-black mb-2">25K+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Athletes Trust Us</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 border border-gray-200 shadow-lg">
              <div className="text-3xl lg:text-4xl font-bold text-black mb-2">4.8★</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Performance Rating</div>
            </div>
          </div>
        </div>

        {/* Side floating elements */}
        <div className="absolute left-10 top-1/2 transform -translate-y-1/2 hidden xl:block">
          <div className="w-20 h-20 bg-white/80 border border-gray-200 shadow-lg flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
        </div>
        
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2 hidden xl:block">
          <div className="w-20 h-20 bg-black text-white flex items-center justify-center">
            <span className="text-2xl font-bold">G</span>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:block">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-px h-12 bg-gray-400"></div>
          <span className="text-xs text-gray-400 uppercase tracking-wider">Scroll</span>
        </div>
      </div>
    </section>
  );
}