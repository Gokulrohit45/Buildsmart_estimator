import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, role = 'user' }) {
  return (
    <div className="app-layout">
      <Sidebar role={role} />
      <div className="main-content">
        <Header role={role} />
        <main className="page-body fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
