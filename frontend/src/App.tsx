import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
import { Home } from './pages/Home';
import { About } from './pages/About';
import { HowItWorks } from './pages/HowItWorks';
import { Contact } from './pages/Contact';
import { FAQ } from './pages/FAQ';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { NotFound } from './pages/NotFound';

// Role Dashboards
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { DonorDashboard } from './pages/dashboards/DonorDashboard';
import { NGODashboard } from './pages/dashboards/NGODashboard';
import { VolunteerDashboard } from './pages/dashboards/VolunteerDashboard';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="flex-1">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />

                  {/* Protected Dashboards */}
                  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                    <Route path="/dashboard/admin" element={<AdminDashboard />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['donor']} />}>
                    <Route path="/dashboard/donor" element={<DonorDashboard />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['ngo']} />}>
                    <Route path="/dashboard/ngo" element={<NGODashboard />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['volunteer']} />}>
                    <Route path="/dashboard/volunteer" element={<VolunteerDashboard />} />
                  </Route>

                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
