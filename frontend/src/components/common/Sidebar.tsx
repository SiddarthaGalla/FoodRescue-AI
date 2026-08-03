import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, Truck, Building2, Users, 
  Settings, LogOut, ChevronLeft, ChevronRight, Bell, 
  BarChart3, Shield, Award, MapPin, HeartHandshake
} from 'lucide-react';
import { UserRole } from '../../types/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface SidebarProps {
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('Signed out of session', 'info');
    navigate('/login');
  };

  const getRoleMenuItems = () => {
    switch (role) {
      case 'admin':
        return [
          { name: 'Overview', path: '/dashboard/admin', icon: LayoutDashboard },
          { name: 'User Management', path: '/dashboard/admin#users', icon: Users },
          { name: 'System Logs', path: '/dashboard/admin#logs', icon: Shield },
          { name: 'Analytics', path: '/dashboard/admin#analytics', icon: BarChart3 },
          { name: 'Settings', path: '/dashboard/admin#settings', icon: Settings },
        ];
      case 'donor':
        return [
          { name: 'Donor Hub', path: '/dashboard/donor', icon: LayoutDashboard },
          { name: 'My Food Donations', path: '/dashboard/donor#donations', icon: Package },
          { name: 'Pickup Schedule', path: '/dashboard/donor#pickups', icon: Truck },
          { name: 'Impact Metrics', path: '/dashboard/donor#impact', icon: Award },
          { name: 'Settings', path: '/dashboard/donor#settings', icon: Settings },
        ];
      case 'ngo':
        return [
          { name: 'NGO Command', path: '/dashboard/ngo', icon: LayoutDashboard },
          { name: 'Available Food Feed', path: '/dashboard/ngo#feed', icon: Package },
          { name: 'Active Claims', path: '/dashboard/ngo#claims', icon: Building2 },
          { name: 'Distribution Routes', path: '/dashboard/ngo#routes', icon: MapPin },
          { name: 'Settings', path: '/dashboard/ngo#settings', icon: Settings },
        ];
      case 'volunteer':
        return [
          { name: 'Rescue Hub', path: '/dashboard/volunteer', icon: LayoutDashboard },
          { name: 'Assigned Routes', path: '/dashboard/volunteer#routes', icon: Truck },
          { name: 'Completed Rescues', path: '/dashboard/volunteer#history', icon: HeartHandshake },
          { name: 'Badges & Rewards', path: '/dashboard/volunteer#badges', icon: Award },
          { name: 'Settings', path: '/dashboard/volunteer#settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const menuItems = getRoleMenuItems();

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-[calc(100vh-5rem)] glass-card border-r border-brand-500/20 py-6 px-3 flex flex-col justify-between"
    >
      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full glass-card border border-brand-500/30 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand-500 shadow-md z-30"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Top Menu Items */}
      <div className="space-y-6">
        {/* User Card */}
        <div className={`flex items-center gap-3 p-2 rounded-2xl bg-brand-500/10 dark:bg-brand-400/10 border border-brand-500/20 ${collapsed ? 'justify-center' : ''}`}>
          <img
            src={user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`}
            alt={user?.name}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-500/30 flex-shrink-0"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-gray-900 dark:text-white">{user?.name}</p>
              <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-brand-600 text-white">
                {role}
              </span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
};
