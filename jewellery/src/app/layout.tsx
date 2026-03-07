import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import CartDrawer from '@/components/cart/CartDrawer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Luxury Jewellery - Timeless Elegance & Exquisite Craftsmanship',
  description: 'Discover our exclusive collection of fine jewelry. Handcrafted necklaces, rings, earrings, and bracelets made with precious metals and gemstones.',
  keywords: 'luxury jewelry, fine jewelry, gold jewelry, diamond jewelry, engagement rings, wedding bands',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <AnnouncementBar />
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  )
}
