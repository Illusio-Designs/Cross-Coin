'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { toast } from '@/lib/toast';
import { sendMessage } from '@/lib/api/contact';

// The contact page is a server component (keeps its metadata), so the
// interactive form lives here. Previously the form had action="#" and no
// handler, so every message was silently discarded on submit.
export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await sendMessage(form);
      toast.success("Thanks! We'll get back to you soon.");
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error(err?.message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="field-row">
        <label>Name<input type="text" name="name" value={form.name} onChange={set('name')} placeholder="Your name" required /></label>
        <label>Email<input type="email" name="email" value={form.email} onChange={set('email')} placeholder="you@email.com" required /></label>
      </div>
      <label>Message<textarea name="message" rows={5} value={form.message} onChange={set('message')} placeholder="How can we help?" required /></label>
      <button type="submit" className="btn btn-primary" disabled={sending} aria-busy={sending}>
        {sending ? 'Sending…' : <>Send message <Icon name="Send" size={16} /></>}
      </button>
    </form>
  );
}
