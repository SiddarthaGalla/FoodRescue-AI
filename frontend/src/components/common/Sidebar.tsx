import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Package, Truck, Building2, 
  Settings, Award, Heart, ShieldCheck, LifeBuoy, X, Send, Loader2, UserCog, BarChart3
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
  const [showAdminRequest, setShowAdminRequest] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'loading'>('none');
  const [requesting, setRequesting] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin || !showAdminRequest) return;
    let mounted = true;
    apiRequest<{ status: string }>('/admin/request/status')
      .then((res) => {
        if (mounted && res?.status) setRequestStatus(res.status as 'none' | 'pending' | 'approved' | 'rejected' | 'loading');
      })
      .catch(() => {
        if (mounted) setRequestStatus('none');
      });
    return () => {
      mounted = false;
    };
  }, [isAdmin, showAdminRequest]);

  const roleMenus: Record<UserRole, { name: string; path: string; icon: any }[]> = {
    donor: [
      { name: 'Dashboard', path: '/dashboard/donor', icon: LayoutDashboard },
      { name: 'My Listings', path: '/dashboard/donor/listings', icon: Package },
      { name: 'Active Pickups', path: '/dashboard/donor/pickups', icon: Truck },
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
      { name: 'Food Analytics', path: '/dashboard/admin/analytics', icon: BarChart3 },
      { name: 'Donors & NGOs', path: '/dashboard/admin/orgs', icon: Building2 },
      { name: 'Support Requests', path: '/dashboard/admin/support', icon: LifeBuoy },
      { name: 'Admin Access', path: '/dashboard/admin/requests', icon: UserCog },
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

  const handleAdminRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    try {
      await apiRequest<{ id: string }>('/admin/request', {
        method: 'POST',
        body: JSON.stringify({ note: requestNote || null }),
      });
      setRequestStatus('pending');
      showToast('Admin access request submitted! The owner will review it shortly.', 'success');
      setRequestNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit request', 'error');
    } finally {
      setRequesting(false);
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
          {isAdmin ? (
            <p className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-[10px] font-bold text-gray-700 dark:text-gray-300">
              You are signed in as the platform administrator. Support tickets from donors, NGOs and volunteers are
              reviewed in <span className="text-brand-600 dark:text-brand-400 font-black">Support Requests</span>.
            </p>
          ) : (
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
          )}
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

      {/* Request Admin Access Modal */}
      {showAdminRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Request Admin Access
              </h3>
              <button onClick={() => setShowAdminRequest(false)} className="p-1.5 rounded-lg glass-card">
                <X className="w-4 h-4" />
              </button>
            </div>

            {requestStatus === 'pending' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <p className="text-xs font-black text-amber-600 dark:text-amber-400">Request Pending</p>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Your admin access request is awaiting review by the platform owner. You will be able to log in as
                  admin once it is approved.
                </p>
              </div>
            )}

            {requestStatus === 'approved' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Access Approved</p>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  You have admin access. Sign out and log back in choosing the Admin role to enter the admin portal.
                </p>
              </div>
            )}

            {requestStatus === 'rejected' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <p className="text-xs font-black text-rose-600 dark:text-rose-400">Request Rejected</p>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Your admin access request was declined. You can submit a new request if needed.
                </p>
              </div>
            )}

            {(requestStatus === 'none' || requestStatus === 'rejected') && (
              <form onSubmit={handleAdminRequestSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">
                    Why do you need admin access? <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="e.g., Managing NGO partnerships for my region"
                    className="w-full px-3 py-2.5 rounded-xl glass-input resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminRequest(false)}
                    className="flex-1 py-3 rounded-xl glass-card font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requesting}
                    className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {requesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {requesting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {requestStatus === 'loading' && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600 dark:text-brand-400" />
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowAdminRequest(false)}
                className="px-4 py-2 rounded-xl glass-card font-bold text-xs"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
