import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Package, Truck, Building2, 
  Settings, Award, Heart, ShieldCheck, LifeBuoy, X, Send, Loader2
} from 'lucide-react';
import { UserRole } from '../../types/auth';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';

interface SidebarProps {
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();
  const { showToast } = useToast();
  const [showSupport, setShowSupport] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest<{ id: string }>('/support', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      });
      showToast('Support request sent! Our dispatch team will reach out soon.', 'success');
      setShowSupport(false);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      showToast(err.message || 'Failed to send support request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Desktop Sidebar (lg screens) */}
      <aside className="w-64 hidden lg:block glass-card border-r border-brand-500/20 p-6 min-h-[calc(100vh-5rem)] space-y-6 flex-shrink-0">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-400 block mb-1">
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
          <button
            onClick={() => setShowSupport(true)}
            className="w-full p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 space-y-1.5 text-left transition-all hover:bg-brand-500/20 cursor-pointer"
          >
            <p className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Need Support?
            </p>
            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
              Contact the 24/7 AI Dispatch Team directly.
            </p>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Bar for Mobile Phones (< lg screens) */}
      <div className="lg:hidden w-full glass-card border-b border-brand-500/20 px-4 py-3 sticky top-16 sm:top-20 z-40 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {menus.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-brand-500/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-current" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Contact Support
              </h3>
              <button onClick={() => setShowSupport(false)} className="p-1.5 rounded-lg glass-card">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              Tell us what you need — our dispatch team reviews every request and responds to your account email.
            </p>
            <form onSubmit={handleSupportSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Need help scheduling a pickup"
                  className="w-full px-3 py-2.5 rounded-xl glass-input"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  className="w-full px-3 py-2.5 rounded-xl glass-input resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupport(false)}
                  className="flex-1 py-3 rounded-xl glass-card font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};
