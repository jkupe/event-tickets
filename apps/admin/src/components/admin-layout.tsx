import { Link, Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@event-tickets/shared-auth';
import { Button } from '@event-tickets/shared-ui';
import { LayoutDashboard, Calendar, LogOut, Settings } from 'lucide-react';
import { cn } from '@event-tickets/shared-ui';

export function AdminLayout() {
  const { name, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/sign-in');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/events', label: 'Events', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-bold text-lg text-blue-900">Admin Portal</h1>
          <p className="text-xs text-gray-500">FBC Pittsfield</p>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                location.pathname.startsWith(item.to)
                  ? 'bg-blue-50 text-blue-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{name}</p>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-6 py-4 lg:hidden flex items-center justify-between">
          <h1 className="font-bold text-blue-900">Admin Portal</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
