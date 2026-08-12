import React from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, MapPin, Award, CheckCircle, Clock, 
  Navigation, Star, Shield, ArrowRight 
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cardHover } from '../../animations/variants';

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const stats = [
    { title: 'Total Deliveries Completed', value: '142', change: '+12 this week', icon: Truck },
    { title: 'Meals Delivered', value: '4,680', change: 'Direct Impact', icon: Award },
    { title: 'On-Time Rating', value: '4.95 ★', change: 'Top 5% Volunteer', icon: Star },
    { title: 'CO₂ Miles Offset', value: '340 mi', change: 'Clean Route Log', icon: Navigation },
  ];

  const assignedRoute = {
    id: 'ROUTE-88',
    pickup: 'Hilton Hotel Executive Kitchen (120 Portions)',
    dropoff: 'Hope Community Shelter (St. Jude Ave)',
    estTime: '22 mins',
    distance: '3.2 miles',
  };

  const handleStartRoute = () => {
    showToast('Route navigation launched! Live GPS tracking active.', 'success');
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="volunteer" />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Volunteer Hero Hub
            </span>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              Welcome back, {user?.name || 'Volunteer Hero'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              View assigned pickup routes, scan arrival QR codes, and view your impact badges.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-6 rounded-3xl glass-card border border-brand-500/20 space-y-3">
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

        {/* Active Route Card */}
        <div className="p-6 rounded-3xl glass-card border border-brand-500/20 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Next Assigned Rescue Dispatch</h3>
            <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-brand-500 text-white">
              Ready for Pickup
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
                <MapPin className="w-4 h-4 text-brand-500" />
                <span>Pickup: {assignedRoute.pickup}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
                <Navigation className="w-4 h-4 text-emerald-500" />
                <span>Dropoff: {assignedRoute.dropoff}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-brand-500/10">
              <span>Estimated Duration: <strong className="text-brand-600 dark:text-brand-400">{assignedRoute.estTime}</strong></span>
              <span>Distance: <strong>{assignedRoute.distance}</strong></span>
            </div>

            <button
              onClick={handleStartRoute}
              className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Navigation Route</span>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};
