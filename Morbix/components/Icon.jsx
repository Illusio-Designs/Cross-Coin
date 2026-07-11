import {
  Truck, RefreshCw, ShieldCheck, Activity, Dumbbell, Gauge, Minus, Sparkles,
  LayoutGrid, Layers, Wind, Footprints, Move, Heart, Leaf, Search, ArrowRight,
  ArrowUpRight, User, ShoppingBag, Star, Phone, Mail, MapPin, Clock, Send,
  Instagram, Youtube, Facebook,
} from 'lucide-react';

const MAP = {
  Truck, RefreshCw, ShieldCheck, Activity, Dumbbell, Gauge, Minus, Sparkles,
  LayoutGrid, Layers, Wind, Footprints, Move, Heart, Leaf, Search, ArrowRight,
  ArrowUpRight, User, ShoppingBag, Star, Phone, Mail, MapPin, Clock, Send,
  Instagram, Youtube, Facebook,
};

/** <Icon name="Truck" size={18} /> — renders the matching lucide icon. */
export default function Icon({ name, ...props }) {
  const Cmp = MAP[name] || Sparkles;
  return <Cmp {...props} />;
}
