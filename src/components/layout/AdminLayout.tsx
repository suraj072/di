import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Layers,
  ChevronLeft,
  LogOut,
  Users,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/initiatives', label: 'Initiatives', icon: Layers },
  { href: '/admin/partners', label: 'Partners', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/access', label: 'Admin Access', icon: ShieldCheck },
];

const AdminLayout = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar - Green themed */}
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-tvs-green text-white">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center border-b border-white/10 px-4">
              <Link to="/" className="flex items-center gap-2">
                <img
                  src="https://www.tvscredit.com/wp-content/uploads/2025/03/tvs_credit_logo.svg"
                  alt="TVS Credit"
                  className="h-10"
                />
              </Link>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              <Button variant="ghost" className="w-full justify-start mb-4 text-white/80 hover:text-white hover:bg-white/10" asChild>
                <Link to="/">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Portal
                </Link>
              </Button>

              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-white/80 hover:text-white hover:bg-white/10',
                    isActive(item.href, item.exact) && 'bg-white text-tvs-green hover:bg-white/90 hover:text-tvs-green font-medium'
                  )}
                  asChild
                >
                  <Link to={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>

            <div className="border-t border-white/10 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-64 flex-1 min-h-screen">
          <div className="container py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
