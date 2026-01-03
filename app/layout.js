import './globals.css'

export const metadata = {
  title: 'PROMPT FORGE - Crafting AI Excellence',
  description: 'Transform ideas into powerful digital solutions using cutting-edge AI and modern web technologies',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}