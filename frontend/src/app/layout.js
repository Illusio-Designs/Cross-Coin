import "./globals.css";

export const metadata = {
  title: "Cross Coin",
  description: "Cross Coin",
  icons: {
    icon: '/crosscoin_logo.png',
    shortcut: '/crosscoin_logo.png',
    apple: '/crosscoin_logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
