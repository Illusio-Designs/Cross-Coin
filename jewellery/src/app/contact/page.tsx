'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Contact form:', formData)
  }

  return (
    <div className="container-custom py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-serif font-bold mb-8 text-center">Contact Us</h1>
        <p className="text-xl text-muted text-center mb-12">
          We're here to help you find the perfect piece
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center p-6 border border-gold/20 bg-white">
            <Mail size={32} className="mx-auto mb-4 text-gold" />
            <h3 className="font-bold mb-2">Email</h3>
            <p className="text-muted">info@luxuryjewellery.com</p>
          </div>
          <div className="text-center p-6 border border-gold/20 bg-white">
            <Phone size={32} className="mx-auto mb-4 text-gold" />
            <h3 className="font-bold mb-2">Phone</h3>
            <p className="text-muted">1-800-LUXURY-1</p>
          </div>
          <div className="text-center p-6 border border-gold/20 bg-white">
            <MapPin size={32} className="mx-auto mb-4 text-gold" />
            <h3 className="font-bold mb-2">Address</h3>
            <p className="text-muted">123 Fifth Avenue, NY 10001</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 border border-gold/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block font-medium mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block font-medium mb-2">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="message" className="block font-medium mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input-field min-h-[200px]"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Send Message
          </button>
        </form>
      </div>
    </div>
  )
}
