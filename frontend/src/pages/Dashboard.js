import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { FiTrendingUp, FiUsers, FiDollarSign, FiAward } from 'react-icons/fi';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        
        if (user?.role === 'professional') {
          const response = await axios.get(
            `${API_URL}/analytics/professional/${user.profileId}`
          );
          setAnalytics(response.data.data);
        } else {
          const response = await axios.get(
            `${API_URL}/analytics/facility/${user.profileId}`
          );
          setAnalytics(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.profileId) {
      fetchAnalytics();
    }
  }, [user]);

  const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-${color}-600 text-sm font-medium`}>{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <Icon className={`text-${color}-600 text-3xl opacity-20`} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-300 border-top-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isProfessional = user?.role === 'professional';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            {isProfessional 
              ? 'Find shifts, track your earnings, and manage your career'
              : 'Manage your workforce, post shifts, and monitor performance'}
          </p>
        </div>

        {/* Stats Grid */}
        {isProfessional && analytics?.performanceMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FiTrendingUp}
              label="Completed Shifts"
              value={analytics.performanceMetrics.completedShifts}
              color="blue"
            />
            <StatCard
              icon={FiDollarSign}
              label="Total Earnings"
              value={`€${analytics.earningsMetrics.totalEarnings.toLocaleString()}`}
              color="green"
            />
            <StatCard
              icon={FiAward}
              label="Average Rating"
              value={`${analytics.qualityMetrics.averageRating}⭐`}
              color="yellow"
            />
            <StatCard
              icon={FiUsers}
              label="Reliability"
              value={`${analytics.performanceMetrics.reliability}%`}
              color="purple"
            />
          </div>
        ) : analytics?.shiftMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FiTrendingUp}
              label="Shifts Posted"
              value={analytics.shiftMetrics.totalPosted}
              color="blue"
            />
            <StatCard
              icon={FiAward}
              label="Fill Rate"
              value={`${analytics.shiftMetrics.fillRate}%`}
              color="green"
            />
            <StatCard
              icon={FiDollarSign}
              label="Total Spent"
              value={`€${analytics.financialMetrics.totalSpent.toLocaleString()}`}
              color="yellow"
            />
            <StatCard
              icon={FiUsers}
              label="Avg Rating"
              value={`${analytics.qualityMetrics.averageRating}⭐`}
              color="purple"
            />
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isProfessional ? (
              <>
                <a
                  href="/shifts"
                  className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-center transition"
                >
                  <p className="text-blue-600 font-semibold">Browse Shifts</p>
                  <p className="text-sm text-gray-600 mt-1">Find available opportunities</p>
                </a>
                <a
                  href="/earnings"
                  className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-center transition"
                >
                  <p className="text-green-600 font-semibold">View Earnings</p>
                  <p className="text-sm text-gray-600 mt-1">Track your income</p>
                </a>
                <a
                  href="/profile"
                  className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-center transition"
                >
                  <p className="text-purple-600 font-semibold">Update Profile</p>
                  <p className="text-sm text-gray-600 mt-1">Complete your information</p>
                </a>
              </>
            ) : (
              <>
                <a
                  href="/create-shift"
                  className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-center transition"
                >
                  <p className="text-blue-600 font-semibold">Create Shift</p>
                  <p className="text-sm text-gray-600 mt-1">Post a new job opening</p>
                </a>
                <a
                  href="/analytics"
                  className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-center transition"
                >
                  <p className="text-green-600 font-semibold">View Analytics</p>
                  <p className="text-sm text-gray-600 mt-1">Monitor performance</p>
                </a>
                <a
                  href="/shifts"
                  className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-center transition"
                >
                  <p className="text-purple-600 font-semibold">Manage Shifts</p>
                  <p className="text-sm text-gray-600 mt-1">View your postings</p>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
