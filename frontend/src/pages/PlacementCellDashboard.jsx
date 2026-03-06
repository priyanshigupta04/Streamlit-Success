import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Bell, FileCheck, BarChart3, Users as UsersIcon } from 'lucide-react';
import DashboardSection from '../components/PlacementCell/DashboardSection';
import UserManagementSection from '../components/PlacementCell/UserManagementSection';
import BroadcastSection from '../components/PlacementCell/BroadcastSection';
import JobApprovalsSection from '../components/PlacementCell/JobApprovalsSection';
import AnalyticsSection from '../components/PlacementCell/AnalyticsSection';
import MentorManagementSection from '../components/PlacementCell/MentorManagementSection';

const VALID_ROLES = ['student', 'recruiter', 'mentor', 'internal_guide', 'placement_cell', 'hod', 'dean'];

const PlacementCellDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPages, setUserPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage);
      if (roleFilter) params.append('role', roleFilter);
      if (userSearch) params.append('search', userSearch);
      const res = await axios.get(`/api/admin/users?${params.toString()}`);
      setUsers(res.data.users);
      setTotalUsers(res.data.total);
      setUserPages(res.data.pages);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'broadcast', label: 'Broadcast', icon: Bell },
    { key: 'approvals', label: 'Job Approvals', icon: FileCheck },
    { key: 'mentors', label: 'Mentor Management', icon: UsersIcon },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleSearchSubmit = (searchText) => {
    setCurrentPage(1);
    setUserSearch(searchText);
  };

  useEffect(() => {
    if (activeTab === 'approvals') fetchPendingJobs();
  }, [activeTab]);

  const fetchPendingJobs = async () => {
    try {
      setLoadingPending(true);
      const res = await axios.get('/api/jobs/pending');
      setPendingJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Failed to load pending jobs', err);
      setPendingJobs([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApprove = async (jobId) => {
    if (!window.confirm('Approve this job and publish it for students?')) return;
    try {
      await axios.put(`/api/jobs/${jobId}/approve`);
      fetchPendingJobs();
      fetchStats();
      alert('Job approved');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (jobId) => {
    const reason = window.prompt('Enter reason for rejection (optional):');
    if (reason === null) return;
    try {
      await axios.put(`/api/jobs/${jobId}/reject`, { reason });
      fetchPendingJobs();
      fetchStats();
      alert('Job rejected and recruiter notified');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-64px)] p-4">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 text-lg">{user?.name}</h3>
            <p className="text-sm text-gray-500">Placement Cell</p>
          </div>
          <nav className="space-y-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === t.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && <DashboardSection stats={stats} />}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <UserManagementSection
              users={users}
              totalUsers={totalUsers}
              userPages={userPages}
              currentPage={currentPage}
              loading={loading}
              onPageChange={setCurrentPage}
              onFilterChange={(role) => {
                setRoleFilter(role);
                setCurrentPage(1);
              }}
              onSearch={handleSearchSubmit}
              onRefresh={() => {
                fetchUsers();
                fetchStats();
              }}
              onUserUpdate={handleRoleChange}
              onUserDelete={handleDeleteUser}
            />
          )}

          {/* BROADCAST TAB */}
          {activeTab === 'broadcast' && <BroadcastSection />}

          {/* APPROVALS TAB */}
          {activeTab === 'approvals' && (
            <JobApprovalsSection
              pendingJobs={pendingJobs}
              loading={loadingPending}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {/* MENTOR MANAGEMENT TAB */}
          {activeTab === 'mentors' && <MentorManagementSection />}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && <AnalyticsSection stats={stats} />}
        </main>
      </div>
    </div>
  );
};

export default PlacementCellDashboard;
