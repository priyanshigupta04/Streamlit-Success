import React from 'react';
import { Users, UserCheck, Building2, Briefcase, FileCheck } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
    <div className={`${color} p-3 rounded-xl text-white`}><Icon size={24} /></div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const DashboardSection = ({ stats }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Placement Cell Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="bg-blue-500" />
        <StatCard icon={UserCheck} label="Students" value={stats?.totalStudents || 0} color="bg-green-500" />
        <StatCard icon={Building2} label="Recruiters" value={stats?.totalRecruiters || 0} color="bg-purple-500" />
        <StatCard icon={Briefcase} label="Open Jobs" value={stats?.openJobs || 0} color="bg-indigo-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Users by Role</h3>
          {stats?.roleCounts?.map(rc => (
            <div key={rc._id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-gray-700 capitalize">{rc._id?.replace('_', ' ')}</span>
              <span className="font-semibold text-gray-800">{rc.count}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Application Stats</h3>
          {stats?.applicationsByStatus?.map(as => (
            <div key={as._id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-gray-700 capitalize">{as._id?.replace('_', ' ')}</span>
              <span className="font-semibold text-gray-800">{as.count}</span>
            </div>
          ))}
          {(!stats?.applicationsByStatus || stats.applicationsByStatus.length === 0) && (
            <p className="text-gray-400 text-sm text-center py-4">No applications yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard icon={Briefcase} label="Total Jobs" value={stats?.totalJobs || 0} color="bg-teal-500" />
        <StatCard icon={FileCheck} label="Pending Documents" value={stats?.pendingDocuments || 0} color="bg-yellow-500" />
      </div>
    </div>
  );
};

export default DashboardSection;
