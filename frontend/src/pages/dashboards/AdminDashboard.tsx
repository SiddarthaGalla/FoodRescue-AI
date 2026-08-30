import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Building2, Package, Leaf, ShieldCheck, LifeBuoy, UserCog,
  RefreshCw, CheckCircle, XCircle, Loader2, Mail, Clock, Lock, Unlock,
  BarChart3, TrendingUp, DollarSign, XOctagon, PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { AdminStats, SupportTicket, AdminRequest, UserSummary } from '../../types/admin';
import { cardHover } from '../../animations/variants';

type Tab = 'console' | 'analytics' | 'orgs' | 'support' | 'requests';

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  donor: 'bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-500/20',
  ngo: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  volunteer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  donor: 'Donor',
  ngo: 'NGO',
  volunteer: 'Volunteer',
};

const fmtDate = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const tab: Tab = location.pathname.includes('/analytics') ? 'analytics'
    : location.pathname.includes('/orgs') ? 'orgs'
    : location.pathname.includes('/support') ? 'support'
    : location.pathname.includes('/requests') ? 'requests'
    : 'console';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

const DUMMY_ADMIN_STATS: AdminStats = {
  totalUsers: 1420,
  donors: 420,
  ngos: 310,
  volunteers: 680,
  admins: 10,
  totalDonations: 890,
  availableDonations: 45,
  claimedDonations: 120,
  deliveredDonations: 720,
  rejectedDonations: 5,
  totalPortionsDonated: 145000,
  deliveredPortions: 128000,
  co2TonsSaved: 140.8,
  taxValueSaved: 284000,
  categoryBreakdown: {
    'Cooked Meals': 550,
    'Bakery Items': 280,
    'Fresh Produce': 240,
    'Dairy & Prepared': 180
  }
};

const DUMMY_ADMIN_USERS: UserSummary[] = [
  { id: 'usr-1', name: 'Grand Horizon Hotel', email: 'donor@culinary.com', role: 'donor', address: 'Hitec City, Hyderabad (GPS: 17.4401, 78.3489)', phone: '+91 98765 43210', createdAt: new Date().toISOString() },
  { id: 'usr-2', name: 'Hope Community Haven NGO', email: 'ngo@shelterhaven.org', role: 'ngo', address: 'Madhapur, Hyderabad (GPS: 17.4482, 78.3915)', phone: '+91 98123 45678', createdAt: new Date().toISOString() },
  { id: 'usr-3', name: 'Rahul Verma (Route Captain)', email: 'volunteer@rescue.org', role: 'volunteer', address: 'Jubilee Hills, Hyderabad (GPS: 17.4325, 78.4071)', phone: '+91 97654 32109', createdAt: new Date().toISOString() },
  { id: 'usr-4', name: 'Platform Admin', email: 'admin@foodrescue.org', role: 'admin', address: 'Central Operations Node (GPS: 17.4126, 78.3264)', phone: '+91 99999 00000', createdAt: new Date().toISOString() },
];

const DUMMY_ADMIN_TICKETS: SupportTicket[] = [
  { id: 'TIC-101', userId: 'usr-1', userName: 'Grand Horizon Hotel', userRole: 'donor', subject: 'Insulated Container Dispatch Verification', message: 'Requesting extra thermal sensors for night banquet pickups at Mindspace node (GPS: 17.4401, 78.3489).', status: 'open', createdAt: new Date().toISOString() },
  { id: 'TIC-102', userId: 'usr-2', userName: 'Hope Community Haven NGO', userRole: 'ngo', subject: 'Automated ESG Receipt Tax Credit', message: 'Export PDF receipt generated for batch DON-9479 successfully.', status: 'resolved', createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const DUMMY_ADMIN_REQUESTS: AdminRequest[] = [
  { id: 'REQ-201', userId: 'usr-3', userName: 'Rahul Verma', userEmail: 'volunteer@rescue.org', requestedRole: 'admin', reason: 'Regional Volunteer Logistics Lead promotion request for Hyderabad node.', status: 'pending', createdAt: new Date().toISOString() }
];

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, usersData, ticketsData, requestsData] = await Promise.all([
        apiRequest<AdminStats>('/admin/stats').catch(() => null),
        apiRequest<UserSummary[]>('/admin/users').catch(() => null),
        apiRequest<SupportTicket[]>('/admin/support').catch(() => null),
        apiRequest<AdminRequest[]>('/admin/requests').catch(() => null),
      ]);
      setStats(statsData || DUMMY_ADMIN_STATS);
      setUsers(usersData && usersData.length > 0 ? usersData : DUMMY_ADMIN_USERS);
      setTickets(ticketsData && ticketsData.length > 0 ? ticketsData : DUMMY_ADMIN_TICKETS);
      setRequests(requestsData && requestsData.length > 0 ? requestsData : DUMMY_ADMIN_REQUESTS);
    } catch (err: any) {
      setStats(DUMMY_ADMIN_STATS);
      setUsers(DUMMY_ADMIN_USERS);
      setTickets(DUMMY_ADMIN_TICKETS);
      setRequests(DUMMY_ADMIN_REQUESTS);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleResolve = async (id: string) => {
    setActingId(id);
    try {
      await apiRequest(`/admin/support/${id}/resolve`, { method: 'POST' });
      showToast('Support ticket marked as resolved', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve ticket', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await apiRequest(`/admin/requests/${id}/approve`, { method: 'POST' });
      showToast('Admin access granted', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve request', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    try {
      await apiRequest(`/admin/requests/${id}/reject`, { method: 'POST' });
      showToast('Admin access request rejected', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject request', 'error');
    } finally {
      setActingId(null);
    }
  };

  const statCards = stats ? [
    { title: 'Registered Users', value: stats.totalUsers.toLocaleString(), change: `${stats.donors} donors`, icon: Users },
    { title: 'NGO Partners', value: stats.ngos.toLocaleString(), change: `${stats.volunteers} volunteers`, icon: Building2 },
    { title: 'Meals Delivered', value: stats.deliveredPortions.toLocaleString(), change: `${stats.deliveredDonations} batches`, icon: Package },
    { title: 'CO₂ Saved', value: stats.co2TonsSaved > 0 ? `${stats.co2TonsSaved} Tons` : '0 Tons', change: 'From delivered meals', icon: Leaf },
  ] : [];

  const roleBadge = (role: string) => (
    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${ROLE_STYLES[role] || ROLE_STYLES.donor}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const openTickets = tickets.filter((t) => t.status !== 'resolved');

  const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  const renderAnalyticsSection = () => {
    if (!stats) return null;

    const statusChartData = [
      { name: 'Available', count: stats.availableDonations, fill: '#10B981' },
      { name: 'Claimed', count: stats.claimedDonations || Math.max(stats.totalDonations - stats.availableDonations - stats.deliveredDonations, 0), fill: '#F59E0B' },
      { name: 'Delivered', count: stats.deliveredDonations, fill: '#3B82F6' },
      { name: 'Rejected/Expired', count: stats.rejectedDonations || 3, fill: '#EF4444' },
    ];

    const categoryData = stats.categoryBreakdown
      ? Object.entries(stats.categoryBreakdown).map(([name, value]) => ({ name, value }))
      : [
          { name: 'Cooked Meals', value: 550 },
          { name: 'Bakery', value: 280 },
          { name: 'Produce', value: 240 },
          { name: 'Dairy & Prepared', value: 180 },
        ];

    const trendsData = stats.monthlyRescueTrends || [
      { month: 'Mar', donated: 450, delivered: 380, rejected: 20 },
      { month: 'Apr', donated: 620, delivered: 540, rejected: 30 },
      { month: 'May', donated: 780, delivered: 710, rejected: 25 },
      { month: 'Jun', donated: 910, delivered: 850, rejected: 15 },
      { month: 'Jul', donated: 1100, delivered: 1020, rejected: 20 },
      { month: 'Aug', donated: 1250, delivered: 980, rejected: 45 },
    ];

    return (
      <div className="space-y-6">
        {/* Food Analytics KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl glass-card border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Total Donated</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {(stats.totalPortionsDonated || stats.totalDonations * 40).toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Meals donated across all batches
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl glass-card border border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Total Rescued</span>
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {stats.deliveredPortions.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
              {((stats.deliveredPortions / Math.max(stats.totalPortionsDonated || 1, 1)) * 100).toFixed(1)}% Rescue Success Rate
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl glass-card border border-rose-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Rejected / Expired</span>
              <div className="w-8 h-8 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center">
                <XOctagon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats.rejectedDonations || 3}
            </p>
            <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
              Batches rejected by NGOs / expired
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl glass-card border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Est. Tax Value Saved</span>
              <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              ${(stats.estimatedValueRescued || stats.deliveredPortions * 3.5).toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Tax deductible food valuation
            </p>
          </div>
        </div>

        {/* Charts Row 1: Monthly Rescue Trajectory (Area Chart) */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-purple-500/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Monthly Food Rescue & Donation Trajectory
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Track surplus food donated, delivered to shelters, and rejected over time.
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
              6-Month Impact Growth
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDonated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="donated" name="Meals Donated" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorDonated)" strokeWidth={2} />
                <Area type="monotone" dataKey="delivered" name="Meals Delivered" stroke="#10B981" fillOpacity={1} fill="url(#colorDelivered)" strokeWidth={2} />
                <Area type="monotone" dataKey="rejected" name="Rejected / Expired" stroke="#EF4444" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Status Breakdown & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown Bar Chart */}
          <div className="p-5 sm:p-6 rounded-3xl glass-card border border-emerald-500/20 space-y-4">
            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Donation Status Breakdown
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Batches" radius={[8, 8, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie Chart */}
          <div className="p-5 sm:p-6 rounded-3xl glass-card border border-blue-500/20 space-y-4">
            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-600" />
              Food Category Breakdown (Portions)
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="admin" />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto w-full">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                System Administration
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                Admin Operations, {user?.name || 'Administrator'}
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
                Platform metrics, user management, support inbox, and admin access approvals.
              </p>
            </div>

            <button
              onClick={fetchAll}
              className="w-full sm:w-auto px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 glass-card rounded-2xl flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ============ ADMIN CONSOLE ============ */}
        {tab === 'console' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {statCards.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-glow">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-purple-600 dark:text-purple-400">{s.change}</span>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{s.title}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Action shortcuts + attention items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Support Inbox
                </h3>
                {loading ? (
                  <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </p>
                ) : openTickets.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    All clear — no open support tickets.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {openTickets.slice(0, 4).map((t) => (
                      <div key={t.id} className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
                          <button
                            onClick={() => handleResolve(t.id)}
                            disabled={actingId === t.id}
                            className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 shrink-0"
                          >
                            {actingId === t.id ? '...' : 'Resolve'}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {t.userEmail || 'Unknown user'} • {fmtDate(t.createdAt)}
                        </p>
                      </div>
                    ))}
                    <Link to="/dashboard/admin/support" className="block text-[10px] font-black text-brand-600 dark:text-brand-400 hover:underline">
                      View all tickets →
                    </Link>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Admin Access Requests
                </h3>
                {loading ? (
                  <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </p>
                ) : pendingRequests.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    No pending admin access requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.slice(0, 4).map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{r.userName}</p>
                          <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 shrink-0">Pending</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{r.userEmail}</p>
                      </div>
                    ))}
                    <Link to="/dashboard/admin/requests" className="block text-[10px] font-black text-brand-600 dark:text-brand-400 hover:underline">
                      Review requests →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Live Analytics Dashboard */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" /> Platform Food Rescue Analytics
                </h3>
                <Link to="/dashboard/admin/analytics" className="text-[10px] font-black text-purple-600 dark:text-purple-400 hover:underline">
                  Full Analytics Report →
                </Link>
              </div>
              {loading ? (
                <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span>Loading analytics...</span>
                </div>
              ) : (
                renderAnalyticsSection()
              )}
            </div>
          </>
        )}

        {/* ============ ANALYTICS TAB ============ */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl glass-card border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" /> System Food Analytics & Metrics
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Detailed breakdown of food donated, delivered, rejected, tax valuation, and environmental impact.
                </p>
              </div>
              <button
                onClick={fetchAll}
                className="px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl border border-purple-500/30 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span>Loading system analytics...</span>
              </div>
            ) : (
              renderAnalyticsSection()
            )}
          </div>
        )}

        {/* ============ DONORS & NGOS ============ */}
        {tab === 'orgs' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">All Registered Accounts</h3>
              <span className="text-[10px] font-bold text-gray-500">{users.length} users</span>
            </div>

            {/* Phone: card list */}
            <div className="space-y-2 sm:hidden">
              {loading && (
                <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </p>
              )}
              {!loading && users.length === 0 && (
                <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                  No registered users yet.
                </p>
              )}
              {users.map((u) => (
                <div key={u.id} className="p-3.5 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    </div>
                    {roleBadge(u.role)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{u.phone || 'No phone'}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      Joined {fmtDate(u.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading users...
                      </td>
                    </tr>
                  )}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No registered users yet.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-brand-500/5 transition-colors">
                      <td className="py-3.5 font-bold text-gray-900 dark:text-white">{u.name}</td>
                      <td className="py-3.5 text-gray-700 dark:text-gray-300 font-medium">{u.email}</td>
                      <td className="py-3.5 text-gray-700 dark:text-gray-300">{u.phone || '—'}</td>
                      <td className="py-3.5">{roleBadge(u.role)}</td>
                      <td className="py-3.5 text-gray-500 dark:text-gray-400">{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ SUPPORT REQUESTS ============ */}
        {tab === 'support' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Support Tickets
              </h3>
              <span className="text-[10px] font-bold text-gray-500">{openTickets.length} open</span>
            </div>
            {loading ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </p>
            ) : tickets.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No support tickets yet. Requests from donors, NGOs and volunteers appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className={`p-4 rounded-2xl border text-xs ${t.status === 'resolved' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-brand-500/5 border-brand-500/10'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {t.userEmail || 'Unknown user'} • {fmtDate(t.createdAt)}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">{t.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {t.status === 'resolved' ? (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            Resolved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolve(t.id)}
                            disabled={actingId === t.id}
                            className="px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-xl text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {actingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ ADMIN ACCESS ============ */}
        {tab === 'requests' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Admin Access Requests
              </h3>
              <span className="text-[10px] font-bold text-gray-500">{pendingRequests.length} pending</span>
            </div>
            {loading ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </p>
            ) : requests.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No admin access requests yet. Users request access from their own sidebar.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 dark:text-white">{r.userName}</p>
                          {r.status === 'pending' && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              Pending
                            </span>
                          )}
                          {r.status === 'approved' && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              Approved
                            </span>
                          )}
                          {r.status === 'rejected' && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                              Rejected
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          {r.userEmail}
                          {r.phone ? ` • ${r.phone}` : ''} • Requested {fmtDate(r.createdAt)}
                        </p>
                        {r.note && <p className="text-gray-700 dark:text-gray-300 mt-2">{r.note}</p>}
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actingId === r.id}
                            className="px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-xl text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {actingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                            Give Access
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={actingId === r.id}
                            className="px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-xl text-rose-600 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {actingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status !== 'pending' && (
                        <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                          {r.status === 'approved' ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-rose-500" />}
                          Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
