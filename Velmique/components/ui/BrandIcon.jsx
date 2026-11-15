'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Menu01Icon, Cancel01Icon, Search01Icon, User02Icon, ShoppingBag01Icon,
  FavouriteIcon, ArrowDown01Icon, ArrowRight01Icon, Tick02Icon,
  AiSparklesIcon, BalanceScaleIcon, DeliveryTruck01Icon, Shield01Icon,
  DeliveryReturn01Icon, Diamond01Icon, Leaf01Icon, HourglassIcon,
  ZoomInAreaIcon, StarIcon, InstagramIcon, Facebook01Icon,
} from '@hugeicons/core-free-icons';

const icons = {
  menu: Menu01Icon, close: Cancel01Icon, search: Search01Icon, user: User02Icon,
  bag: ShoppingBag01Icon, heart: FavouriteIcon, down: ArrowDown01Icon,
  arrow: ArrowRight01Icon, check: Tick02Icon, sparkles: AiSparklesIcon,
  scale: BalanceScaleIcon, truck: DeliveryTruck01Icon, shield: Shield01Icon,
  returns: DeliveryReturn01Icon, gem: Diamond01Icon, leaf: Leaf01Icon,
  hourglass: HourglassIcon, zoom: ZoomInAreaIcon, star: StarIcon,
  instagram: InstagramIcon, facebook: Facebook01Icon,
};

export default function BrandIcon({ name, size = 20, strokeWidth = 1.6, ...props }) {
  return <HugeiconsIcon icon={icons[name]} size={size} strokeWidth={strokeWidth} color="currentColor" aria-hidden="true" {...props} />;
}

const makeIcon = name => function Icon(props) { return <BrandIcon name={name} {...props} />; };
export const Truck = makeIcon('truck');
export const ShieldCheck = makeIcon('shield');
export const RotateCcw = makeIcon('returns');
export const Gem = makeIcon('gem');
export const Leaf = makeIcon('leaf');
export const Hourglass = makeIcon('hourglass');
export const Heart = makeIcon('heart');
export const Sparkles = makeIcon('sparkles');
export const Scale = makeIcon('scale');
export const ArrowRight = makeIcon('arrow');
export const Check = makeIcon('check');
export const ChevronDown = makeIcon('down');
