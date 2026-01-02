import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useSettings } from '@/contexts/SettingsContext';

export function MainLayout() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <Navbar />
        <main className="p-6 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
        <footer className="border-t border-border py-4 px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {settings?.site_name || 'CardioRegistry'}. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
