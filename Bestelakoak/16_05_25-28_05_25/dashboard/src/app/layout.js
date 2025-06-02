import './globals.css'

export const metadata = {
  title: 'Dashboard',
  description: 'LLM Test Efficiency Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <nav style={{ 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ 
            maxWidth: '1280px', 
            margin: '0 auto', 
            padding: '0 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            height: '4rem',
            alignItems: 'center'
          }}>
            <h1 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 'bold', 
              color: '#111827',
              margin: 0
            }}>
              LLM Test Dashboard
            </h1>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
