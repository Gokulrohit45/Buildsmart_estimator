import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, role = 'user' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bs_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleCollapseChange = () => {
      setIsCollapsed(localStorage.getItem('bs_sidebar_collapsed') === 'true');
    };
    window.addEventListener('sidebar-collapse-change', handleCollapseChange);
    return () => window.removeEventListener('sidebar-collapse-change', handleCollapseChange);
  }, []);

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

      <div className={`main-content${isCollapsed ? ' collapsed' : ''}`}>
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
