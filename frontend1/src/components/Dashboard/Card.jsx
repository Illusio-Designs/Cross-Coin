export default function Card({ title, price, description, features, selected, onSelect, children }) {
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-6 flex flex-col items-center transition hover:shadow-xl ${selected ? 'ring-2 ring-green-400' : ''}`}>
      <div className="mb-4">
        {children}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <div className="text-3xl font-extrabold text-green-600 mb-2">{price}</div>
      <p className="text-gray-500 mb-4 text-center">{description}</p>
      <ul className="mb-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✔</span> {f}
          </li>
        ))}
      </ul>
      <button
        className={`w-full py-2 rounded ${selected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-green-50'}`}
        onClick={onSelect}
      >
        {selected ? 'Selected' : 'Select'}
      </button>
    </div>
  );
} 