import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, Sun, Moon, Menu, X, LogIn, UserPlus, 
  LayoutDashboard, LogOut, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Contact', path: '/contact' },
    { name: 'FAQ', path: '/faq' },
  ];

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
    setUserDropdownOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-nav transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.05 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow text-white"
            >
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-500 bg-clip-text text-transparent">
                FoodRescue AI
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest font-black text-brand-700 dark:text-brand-400">
                Zero Waste Initiative
              </span>
            </div>
          </Link>

          {/* Centered Desktop Nav Links Pill */}
          <div className="hidden md:flex items-center gap-1 bg-brand-500/10 dark:bg-brand-950/40 p-1.5 rounded-full border border-brand-500/20 shadow-sm">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                  isActive(link.path)
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-gray-900 dark:text-gray-100 hover:text-brand-600 hover:bg-brand-500/10'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Action Right (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl glass-card text-gray-900 dark:text-gray-100 hover:border-brand-500/40 transition-all border border-gray-200 dark:border-gray-800"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-brand-600" />}
            </motion.button>

            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-2xl glass-card border border-brand-500/30 hover:border-brand-500/60 transition-all"
                >
                  <img
                    src={user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-brand-500/40"
                  />
                  <div className="text-left">
                    <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.name}</p>
                    <span className="text-[9px] font-black uppercase text-brand-700 dark:text-brand-400">{user.role}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 rounded-2xl glass-card border border-brand-500/30 shadow-2xl p-2 space-y-1"
                    >
                      <Link
                        to={`/dashboard/${user.role}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-gray-900 dark:text-white hover:bg-brand-500/10 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-brand-600" />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2.5 text-xs font-black text-gray-900 dark:text-white glass-card hover:border-brand-500/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </motion.button>
                </Link>
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Get Started</span>
                  </motion.button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Phone Controls (< md) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl glass-card text-gray-900 dark:text-gray-100"
              aria-label="Toggle Mobile Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-brand-600" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl glass-card text-gray-900 dark:text-gray-100"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Popover */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden glass-nav border-b border-brand-500/20 px-4 pt-3 pb-5 space-y-2.5 shadow-2xl"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-xs font-black transition-all ${
                  isActive(link.path)
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-brand-500/10'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
              {isAuthenticated && user ? (
                <>
                  <Link
                    to={`/dashboard/${user.role}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full text-center px-4 py-3 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full py-3 text-xs font-black glass-card rounded-xl border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full py-3 text-xs font-black text-white bg-brand-600 rounded-xl shadow-glow">
                      Get Started
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
