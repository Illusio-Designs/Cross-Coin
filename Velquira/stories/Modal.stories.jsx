import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

export default {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: { title: { control: 'text' } },
  args: { title: 'Confirm action' },
};

const Template = (args) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 32 }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', background: '#1c170c', color: '#fff', borderRadius: 6 }}
      >
        Re-open modal
      </button>
      <Modal {...args} open={open} onClose={() => setOpen(false)}>
        <p style={{ marginBottom: 16, color: '#374151' }}>
          Are you sure you want to do that? Focus is trapped inside this
          panel — try tabbing through and you&apos;ll see it wrap. Press
          Escape to dismiss.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6 }}>
            Cancel
          </button>
          <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', background: '#1c170c', color: '#fff', borderRadius: 6 }}>
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
};

export const Default = Template.bind({});
export const NoTitle = Template.bind({});
NoTitle.args = { title: undefined };
