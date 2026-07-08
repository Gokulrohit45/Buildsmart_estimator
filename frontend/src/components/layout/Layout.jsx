import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, role = 'user' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Dark overlay — only visible on mobile when sidebar is open */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Header
          role={role}
          onHamburgerClick={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="page-body fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
