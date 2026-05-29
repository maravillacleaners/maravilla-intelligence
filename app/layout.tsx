import type { Metadata } from 'next'
import GlobalSearch from './components/GlobalSearch'

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
        {/* Google Fonts: Inter + JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{__html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FAFAF9;
            color: #1C1917;
          }

          /* ── Global keyframes ── */

          @keyframes pulseDot {
            0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
            40%            { opacity: 1;    transform: scale(1);   }
          }

          @keyframes shimmer {
            0%   { background-position: -400px 0; }
            100% { background-position:  400px 0; }
          }

          @keyframes confettiFall {
            0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
            100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
          }

          @keyframes cmdkFade {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0);    }
          }

          @keyframes cmdkPop {
            from { opacity: 0; transform: translateX(-50%) scale(0.96); }
            to   { opacity: 1; transform: translateX(-50%) scale(1);    }
          }

          /* Scrollbar styling */
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #E7E5E4; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: #C7C3C0; }
        `}} />
      </head>
      <body>
        {children}
        <GlobalSearch />
      </body>
    </html>
  )
}
