import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Truck, Building2, 
  Settings, Award, Heart, ShieldCheck
} from 'lucide-react';
import { UserRole } from '../../types/auth';

interface SidebarProps {
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();

  const roleMenus: Record<UserRole, { name: string; path: string; icon: any }[]> = {
    donor: [
      { name: 'Dashboard', path: '/dashboard/donor', icon: LayoutDashboard },
      { name: 'My Listings', path: '/dashboard/donor/listings', icon: Package },
      { name: 'Active Pickups', path: '/dashboard/donor/pickups', icon: Truck },
      { name: 'Tax Receipts', path: '/dashboard/donor/tax', icon: Award },
    ],
    ngo: [
      { name: 'Overview', path: '/dashboard/ngo', icon: LayoutDashboard },
      { name: 'Available Food', path: '/dashboard/ngo/available', icon: Package },
      { name: 'Deliveries', path: '/dashboard/ngo/deliveries', icon: Truck },
      { name: 'Impact Report', path: '/dashboard/ngo/impact', icon: Heart },
    ],
    volunteer: [
      { name: 'Deliveries Hub', path: '/dashboard/volunteer', icon: LayoutDashboard },
      { name: 'Nearby Routes', path: '/dashboard/volunteer/routes', icon: Truck },
      { name: 'History', path: '/dashboard/volunteer/history', icon: Package },
    ],
    admin: [
      { name: 'Admin Console', path: '/dashboard/admin', icon: LayoutDashboard },
      { name: 'Donors & NGOs', path: '/dashboard/admin/orgs', icon: Building2 },
      { name: 'System AI Logs', path: '/dashboard/admin/logs', icon: ShieldCheck },
      { name: 'Settings', path: '/dashboard/admin/settings', icon: Settings },
    ],
  };

  const menus = roleMenus[role] || roleMenus.donor;

  return (
    <aside className="w-64 hidden lg:block glass-card border-r border-brand-500/20 p-6 min-h-[calc(100vh-5rem)] space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-400 block mb-2">
          {role} Workspace
        </span>
        <h3 className="text-lg font-black text-gray-900 dark:text-white capitalize">{role} Portal</h3>
      </div>

      <nav className="space-y-1.5">
        {menus.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-brand-500/10 hover:text-brand-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 space-y-1">
          <p className="text-xs font-black text-gray-900 dark:text-white">Need Support?</p>
          <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
            Contact 24/7 AI Dispatch Team directly.
          </p>
        </div>
      </div>
    </aside>
  );
};
