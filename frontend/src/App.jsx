
import { Route, Routes } from 'react-router'

function PlaceholderPage({ title }) {
  return (
    <main className="min-h-screen bg-black text-warm-white flex items-center justify-center">
      <h1 className="font-heading text-4xl font-bold">
        {title}
      </h1>
    </main>
  )
}

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<PlaceholderPage title="Home" />} />
      <Route path="/about" element={<PlaceholderPage title="About Us" />} />
      <Route path="/worship" element={<PlaceholderPage title="Worship Schedule" />} />

      {/* Devotional */}
      <Route path="/devotional" element={<PlaceholderPage title="Daily Devotional" />} />
      <Route path="/devotional/:slug" element={<PlaceholderPage title="Devotional Detail" />} />

      {/* Sermons */}
      <Route path="/sermons" element={<PlaceholderPage title="Sermons" />} />
      <Route path="/sermons/:slug" element={<PlaceholderPage title="Sermon Detail" />} />

      {/* Gallery */}
      <Route path="/gallery" element={<PlaceholderPage title="Gallery" />} />
      <Route path="/gallery/:slug" element={<PlaceholderPage title="Gallery Album Detail" />} />

      {/* Announcements */}
      <Route path="/announcements" element={<PlaceholderPage title="Announcements" />} />
      <Route path="/announcements/:slug" element={<PlaceholderPage title="Announcement Detail" />} />

      {/* Contact */}
      <Route path="/contact" element={<PlaceholderPage title="Contact" />} />

      {/* Not Found */}
      <Route path="*" element={<PlaceholderPage title="404 - Page Not Found" />} />
    </Routes>
  )
}

export default App
