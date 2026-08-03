import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, Sun, Moon, Menu, X, LogIn, UserPlus, 
  ChevronDown, LayoutDashboard, LogOut, Bell
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Contact', path: '/contact' },
    { name: 'FAQ', path: '/faq' },
  ];

  const handleLogout = () => {
    logout();
    showToast('Successfully logged out', 'info');
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    return `/dashboard/${user.role}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 flex items-center justify-center shadow-glow text-white"
            >
              <Leaf className="w-6 h-6" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-700 via-brand-500 to-emerald-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-emerald-300">
                FoodRescue AI
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-brand-600/80 dark:text-brand-400/80 uppercase -mt-1">
                Zero Hunger • AI Driven
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 glass-card px-4 py-2 rounded-2xl">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-brand-500/10 dark:bg-brand-400/15 rounded-xl border border-brand-500/20"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Items */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-xl glass-card text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-brand-600" />}
            </motion.button>

            {isAuthenticated && user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl glass-card hover:border-brand-500/40 transition-all"
                >
                  <img
                    src={user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                    alt={user.name}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-brand-500/30"
                  />
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-bold leading-tight text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-[10px] font-semibold uppercase text-brand-600 dark:text-brand-400">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </motion.button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-56 p-2 rounded-2xl glass-card shadow-2xl border border-brand-500/20 backdrop-blur-2xl z-50"
                    >
                      <div className="px-3 py-2 border-b border-gray-200/50 dark:border-gray-800/50">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                      <div className="pt-2 flex flex-col gap-1">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate(getDashboardPath());
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-200 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          {user.role.toUpperCase()} Dashboard
                        </button>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 glass-card hover:bg-brand-500/10 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    Sign In
                  </motion.button>
                </Link>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(34, 197, 94, 0.4)' }}
                    whileTap={{ scale: 0.96 }}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-xl shadow-glow transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Get Started
                  </motion.button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl glass-card text-gray-600 dark:text-gray-300"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-brand-600" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl glass-card text-gray-700 dark:text-gray-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass-card border-t border-brand-500/20 px-4 pt-3 pb-6 flex flex-col gap-3"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-500 rounded-xl hover:bg-brand-500/10"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(getDashboardPath());
                    }}
                    className="w-full py-3 text-xs font-bold text-white bg-brand-600 rounded-xl flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Go to {user.role.toUpperCase()} Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-3 text-xs font-bold text-red-600 bg-red-500/10 rounded-xl flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full py-3 text-xs font-bold glass-card rounded-xl text-center">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full py-3 text-xs font-bold text-white bg-brand-600 rounded-xl shadow-glow text-center">
                      Get Started
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
