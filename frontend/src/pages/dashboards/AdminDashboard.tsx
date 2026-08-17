import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Building2, Package, Shield, BarChart3, 
  TrendingUp, AlertTriangle, CheckCircle, RefreshCw 
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { slideUp, cardHover } from '../../animations/variants';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { title: 'Total Registered Users', value: '0', change: 'Awaiting data', icon: Users },
    { title: 'Active Donors', value: '0', change: 'Awaiting data', icon: Building2 },
    { title: 'Verified Shelter NGOs', value: '0', change: 'Awaiting data', icon: Shield },
    { title: 'Total Meals Rescued', value: '0', change: 'Awaiting data', icon: Package },
  ];

  const recentLogs: { time: string; type: string; detail: string; status: string }[] = [];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="admin" />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              System Administration
            </span>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              Admin Operations Command
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time platform metrics, user access management, and AI engine health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 glass-card rounded-xl flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Node Status
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={idx}
                whileHover="hover"
                variants={cardHover}
                className="p-6 rounded-3xl glass-card border border-brand-500/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">{s.change}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.title}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts & System Log Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Chart Placeholder */}
          <div className="lg:col-span-7 p-6 rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Platform Rescue Volume (30 Days)</h3>
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Awaiting data
              </span>
            </div>

            {/* Chart Placeholder */}
            <div className="h-48 flex items-center justify-center rounded-2xl bg-brand-500/5 border border-brand-500/10">
              <p className="text-xs text-gray-500 dark:text-gray-400">No data yet — charts appear once donations flow through the platform.</p>
            </div>
          </div>

          {/* System Audit Activity */}
          <div className="lg:col-span-5 p-6 rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Live System Audit</h3>
            <div className="space-y-3">
              {recentLogs.length === 0 && (
                <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 text-center text-xs text-gray-500 dark:text-gray-400">
                  No system activity yet.
                </div>
              )}
              {recentLogs.map((log, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-brand-500/5 border border-brand-500/10 flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                      <span>{log.type}</span>
                      <span className="text-[10px] text-gray-400 font-normal">{log.time}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-[11px] mt-0.5">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
