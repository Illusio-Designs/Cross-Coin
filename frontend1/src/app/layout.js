import "./globals.css";

export const metadata = {
  title: "Cross Coin",
  description: "Cross Coin",
  icons: {
    icon: '/crosscoin icon.png',
    shortcut: '/crosscoin icon.png',
    apple: '/crosscoin icon.png',
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