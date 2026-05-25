import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Maravilla Intelligence Dashboard',
  description: 'Commercial Intelligence System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
