import { Link, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '@event-tickets/shared-auth';
import { Button } from '@event-tickets/shared-ui';
import { Ticket, LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { isAuthenticated, name, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <Ticket className="h-6 w-6" />
              <span className="hidden sm:inline">FBC Pittsfield Events</span>
              <span className="sm:hidden">FBC Events</span>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link to="/events" className="text-blue-100 hover:text-white transition-colors">
                Events
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/tickets" className="text-blue-100 hover:text-white transition-colors">
                    My Tickets
                  </Link>
                  <span className="text-blue-200 text-sm">{name}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-blue-100 hover:text-white hover:bg-blue-800">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link to="/auth/sign-in">
                  <Button variant="secondary" size="sm">Sign In</Button>
                </Link>
              )}
            </nav>

            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <Link to="/events" className="block py-2 text-blue-100 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                Events
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/tickets" className="block py-2 text-blue-100 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                    My Tickets
                  </Link>
                  <button onClick={handleLogout} className="block py-2 text-blue-100 hover:text-white">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/auth/sign-in" className="block py-2 text-blue-100 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          First Baptist Church of Pittsfield, MA
        </div>
      </footer>
    </div>
  );
}
