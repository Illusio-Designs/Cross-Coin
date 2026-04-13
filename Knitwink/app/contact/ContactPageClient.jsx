'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Clock, ChevronDown, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { sendMessage } from '@/lib/api/contact';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  subject: z.string().min(1, 'Select a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters')
});



const SUBJECT_OPTIONS = [
{ value: '', label: 'Select a subject' },
{ value: 'order', label: 'Order enquiry' },
{ value: 'returns', label: 'Returns & exchanges' },
{ value: 'product', label: 'Product question' },
{ value: 'sustainability', label: 'Sustainability' },
{ value: 'other', label: 'Other' }];


const CONTACT_INFO = [
{ icon: Mail, label: 'Email', value: 'hello@allbirds.com' },
{ icon: Phone, label: 'Phone', value: '+1 (800) 555-0100' },
{ icon: Clock, label: 'Hours', value: 'Mon–Fri, 9am–6pm PST' }];


const FAQS = [
{ q: 'How do I return or exchange my order?', a: 'We offer free returns within 30 days of purchase. Visit your order history to initiate a return.' },
{ q: 'How long does shipping take?', a: 'Standard shipping takes 3–5 business days. Express options are available at checkout.' },
{ q: 'Are Allbirds shoes machine washable?', a: 'Yes — most styles can be washed on a gentle cold cycle. Remove the insoles and laces first.' },
{ q: 'What is your carbon footprint commitment?', a: 'We publish the carbon footprint of every product and are committed to cutting it in half by 2025.' },
{ q: 'Do you offer a size guarantee?', a: 'Yes. If your size doesn\'t fit, we\'ll exchange it for free — no questions asked.' }];


function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        aria-expanded={open}>
        
        <span className="text-sm font-medium text-brand-black">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true" />
        
      </button>
      <AnimatePresence initial={false}>
        {open &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden">
          
            <p className="pb-5 text-sm leading-relaxed text-gray-600">{a}</p>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}

export function ContactPageClient() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      await sendMessage(data);
      setSent(true);
      reset();
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  };

  return (
    <>
      {/* Main contact section */}
      <section className="bg-white px-6 py-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-site">
          {/* Heading */}
          <div className="mb-16 text-center">
            <h1 className="font-display text-4xl font-normal text-brand-black lg:text-5xl">
              Get in touch
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
              We&apos;re here to help. Reach out and we&apos;ll get back to you within 24 hours.
            </p>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            {/* Left — contact info */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                {CONTACT_INFO.map(({ icon: Icon, label, value }) =>
                <div key={label} className="flex items-center gap-4 rounded-2xl border border-gray-200 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage/10">
                      <Icon size={18} className="text-sage" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-gray-600">{label}</p>
                      <p className="mt-0.5 text-sm text-brand-black">{value}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right — form */}
            <div>
              {sent ?
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 p-10 text-center">
                  <CheckCircle size={40} className="text-sage" />
                  <p className="text-base font-medium text-brand-black">Message sent</p>
                  <p className="text-sm text-gray-600">Thanks! We&apos;ll be in touch within 24 hours.</p>
                  <button
                  onClick={() => setSent(false)}
                  className="mt-2 text-sm text-brand-black underline underline-offset-4 hover:text-sage transition-colors duration-150">
                  
                    Send another message
                  </button>
                </div> :

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
                  <Input
                  label="Name"
                  autoComplete="name"
                  {...register('name')}
                  error={errors.name?.message} />
                
                  <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  error={errors.email?.message} />
                
                  <Select
                  label="Subject"
                  options={SUBJECT_OPTIONS}
                  {...register('subject')}
                  error={errors.subject?.message} />
                
                  <div className="flex flex-col gap-1.5">
                    <label
                    htmlFor="message"
                    className="text-xs font-medium uppercase tracking-widest text-gray-800">
                    
                      Message
                    </label>
                    <textarea
                    id="message"
                    rows={5}
                    placeholder="How can we help?"
                    {...register('message')}
                    className={`w-full resize-none rounded-lg border px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 transition-colors duration-150 focus:border-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 ${errors.message ? 'border-error' : 'border-gray-200'}`} />
                  
                    {errors.message &&
                  <p className="text-xs text-error" role="alert">{errors.message.message}</p>
                  }
                  </div>
                  {serverError &&
                <p className="text-sm text-error" role="alert">{serverError}</p>
                }
                  <Button type="submit" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? 'Sending…' : 'Send Message'}
                  </Button>
                </form>
              }
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="bg-off-white px-6 py-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-site">
          <h2 className="mb-8 font-display text-3xl font-normal text-brand-black">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl">
            {FAQS.map((faq) =>
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            )}
          </div>
        </div>
      </section>
    </>);

}