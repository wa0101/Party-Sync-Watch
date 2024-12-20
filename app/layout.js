import './globals.css'

export const metadata = {
  title: 'Party Sync Watch',
  description: 'Watch videos together in sync with friends',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-primary min-h-screen">
        {children}
      </body>
    </html>
  )
} 