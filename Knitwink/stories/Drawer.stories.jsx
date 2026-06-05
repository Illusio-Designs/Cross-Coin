import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';

export default {
  title: 'UI/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    side: { control: { type: 'radio' }, options: ['left', 'right'] },
    title: { control: 'text' },
  },
  args: {
    title: 'Filter products',
    side: 'right',
  },
};

const Template = (args) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24 }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', background: '#111', color: '#fff', borderRadius: 6 }}
      >
        Re-open drawer
      </button>
      <Drawer {...args} open={open} onClose={() => setOpen(false)}>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: '#374151' }}>
            Drawer contents. The focus trap is active — try tabbing; focus
            wraps inside this panel. Escape closes the drawer (returns
            focus to the trigger).
          </p>
          <button style={{ marginTop: 16, padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6 }}>
            Focusable button 1
          </button>
          <button style={{ marginLeft: 8, padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6 }}>
            Focusable button 2
          </button>
        </div>
      </Drawer>
    </div>
  );
};

export const RightSide = Template.bind({});
export const LeftSide = Template.bind({});
LeftSide.args = { side: 'left', title: 'Account' };
