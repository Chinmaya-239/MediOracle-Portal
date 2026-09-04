import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FacilityDashboard from './pages/facility/Dashboard';
import ProfessionalPortal from './pages/professional/Portal';
import ShiftsList from './pages/shifts/ShiftsList';
import CreateShift from './pages/shifts/CreateShift';
import ShiftDetail from './pages/shifts/ShiftDetail';
import ProfileSetup from './pages/profile/ProfileSetup';
import Timekeeping from './pages/timekeeping/Timekeeping';
import Payments from './pages/payments/Payments';
import Analytics from './pages/analytics/Analytics';
import NotFound from './pages/NotFound';

// Context/Store
import { useAuthStore } from './store/authStore';

function App() {
  const { user, initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-blue-300 border-top-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-lg text-gray-600">Loading MediOracle...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user && <Navbar />}
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                {user?.role === 'professional' ? <ProfessionalPortal /> : <FacilityDashboard />}
              </PrivateRoute>
            } 
          />
          
          {/* Professional Routes */}
          <Route 
            path="/shifts" 
            element={
              <PrivateRoute requiredRole="professional">
                <ShiftsList />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/shifts/:id" 
            element={
              <PrivateRoute requiredRole="professional">
                <ShiftDetail />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/timekeeping" 
            element={
              <PrivateRoute requiredRole="professional">
                <Timekeeping />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/earnings" 
            element={
              <PrivateRoute requiredRole="professional">
                <Payments />
              </PrivateRoute>
            } 
          />
          
          {/* Facility Routes */}
          <Route 
            path="/create-shift" 
            element={
              <PrivateRoute requiredRole={['facility_manager', 'facility_admin']}>
                <CreateShift />
              </PrivateRoute>
            } 
          />
          
          {/* Shared Routes */}
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <ProfileSetup />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/analytics" 
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            } 
          />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        <ToastContainer 
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
