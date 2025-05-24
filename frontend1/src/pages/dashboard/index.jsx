import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import Sidebar from "@/components/Sidebar/Sidebar.jsx";
import Card from "@/components/Dashboard/Card.jsx";
import { useState } from "react";
import { FaEye, FaChartBar, FaRocket } from "react-icons/fa";

export default function Dashboard() {
  const [selected, setSelected] = useState(0);
  const cards = [
    {
      title: "Free",
      price: "$0",
      description: "Best for high research, medical, legal and B2B content.",
      features: ["Feature 1", "Feature 2"],
      icon: <FaEye className="text-4xl text-green-400" />,
    },
    {
      title: "Standard",
      price: "$40",
      description: "Best for low research and/or consumer targeted content.",
      features: ["Feature 1", "Feature 2"],
      icon: <FaChartBar className="text-4xl text-green-400" />,
    },
    {
      title: "Pro",
      price: "$99",
      description: "Best for low research and/or consumer targeted content.",
      features: ["Feature 1", "Feature 2"],
      icon: <FaRocket className="text-4xl text-green-400" />,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 bg-gradient-to-br from-green-50 to-white min-h-screen">
          <h1 className="text-2xl font-bold mb-8">My Sites Details</h1>
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Content Quality</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {cards.map((card, idx) => (
                <Card
                  key={card.title}
                  title={card.title}
                  price={card.price}
                  description={card.description}
                  features={card.features}
                  selected={selected === idx}
                  onSelect={() => setSelected(idx)}
                >
                  {card.icon}
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
} 