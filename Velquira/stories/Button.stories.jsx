import { Button } from '@/components/ui/Button';

export default {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
    variant: { control: { type: 'select' }, options: ['primary', 'secondary', 'ghost', 'outline'] },
    size: { control: { type: 'select' }, options: ['small', 'medium', 'large'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  args: {
    children: 'Add to Cart',
    variant: 'primary',
    size: 'medium',
    disabled: false,
  },
};

export const Primary = {};
export const Secondary = { args: { variant: 'secondary' } };
export const Ghost = { args: { variant: 'ghost' } };
export const Disabled = { args: { disabled: true } };
export const SmallSize = { args: { size: 'small', children: 'Save' } };
export const LongLabel = { args: { children: 'Add to Bag — Free Shipping over ₹500' } };
