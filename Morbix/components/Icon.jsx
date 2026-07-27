import { HugeiconsIcon } from '@hugeicons/react';
import {
  TruckIcon, RefreshIcon, ShieldIcon, Activity01Icon, Dumbbell01Icon, GaugeIcon,
  MinusSignIcon, SparklesIcon, GridIcon, Layers01Icon, CloudFastWindIcon,
  RunningShoesIcon, Move01Icon, FavouriteIcon, Leaf01Icon, Search01Icon,
  ArrowRight01Icon, ArrowUpRight01Icon, UserCircleIcon, ShoppingBag03Icon,
  StarIcon, CallIcon, Mail01Icon, Location01Icon, Clock01Icon, SentIcon,
  InstagramIcon, YoutubeIcon, FacebookIcon,
  Menu01Icon, Cancel01Icon, FilterHorizontalIcon, ArrowDown01Icon, ArrowUpDownIcon,
  Tick02Icon, Delete02Icon,
} from '@hugeicons/core-free-icons';

// HugeIcons (free set = stroke-rounded style). One place maps the app's
// semantic icon names to HugeIcons, so `<Icon name="…" />` works everywhere.
const MAP = {
  Truck: TruckIcon, RefreshCw: RefreshIcon, ShieldCheck: ShieldIcon,
  Activity: Activity01Icon, Dumbbell: Dumbbell01Icon, Gauge: GaugeIcon,
  Minus: MinusSignIcon, Sparkles: SparklesIcon, LayoutGrid: GridIcon,
  Layers: Layers01Icon, Wind: CloudFastWindIcon, Footprints: RunningShoesIcon,
  Move: Move01Icon, Heart: FavouriteIcon, Leaf: Leaf01Icon, Search: Search01Icon,
  ArrowRight: ArrowRight01Icon, ArrowUpRight: ArrowUpRight01Icon,
  User: UserCircleIcon, ShoppingBag: ShoppingBag03Icon, Star: StarIcon,
  Phone: CallIcon, Mail: Mail01Icon, MapPin: Location01Icon, Clock: Clock01Icon,
  Send: SentIcon, Instagram: InstagramIcon, Youtube: YoutubeIcon, Facebook: FacebookIcon,
  Menu: Menu01Icon, X: Cancel01Icon, Filter: FilterHorizontalIcon,
  ChevronDown: ArrowDown01Icon, Sort: ArrowUpDownIcon, Check: Tick02Icon,
  Trash: Delete02Icon,
};

/** <Icon name="Truck" size={18} /> — renders the matching HugeIcons (rounded). */
export default function Icon({ name, size = 18, color, className, strokeWidth = 1.8 }) {
  const icon = MAP[name] || SparklesIcon;
  return <HugeiconsIcon icon={icon} size={size} color={color} className={className} strokeWidth={strokeWidth} />;
}
