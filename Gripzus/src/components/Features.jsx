const features = [
  {
    icon: '🎯',
    title: 'Precision Control',
    description: 'Engineered for ultimate accuracy',
  },
  {
    icon: '🚚',
    title: 'Free Shipping',
    description: 'On orders over $75 worldwide',
  },
  {
    icon: '⚡',
    title: 'Performance Ready',
    description: 'Professional-grade materials',
  },
  {
    icon: '💯',
    title: '100% Satisfaction',
    description: '30-day money-back guarantee',
  },
];

export default function Features() {
  return (
    <section className="py-16 lg:py-20 bg-white border-y border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl lg:text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}