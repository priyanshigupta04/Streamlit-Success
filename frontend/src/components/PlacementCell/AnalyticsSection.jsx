import React from 'react';
import { Users, Briefcase, Award, CheckCircle2, FileCheck, Building2 } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
    <div className={`${color} p-3 rounded-xl text-white`}><Icon size={24} /></div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const AnalyticsSection = ({ stats }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Platform Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="bg-blue-500" />
        <StatCard icon={Briefcase} label="Total Jobs" value={stats?.totalJobs || 0} color="bg-teal-500" />
        <StatCard icon={Award} label="Total Applications" value={stats?.totalApplications || 0} color="bg-purple-500" />
        <StatCard icon={CheckCircle2} label="Open Positions" value={stats?.openJobs || 0} color="bg-green-500" />
        <StatCard icon={FileCheck} label="Pending Documents" value={stats?.pendingDocuments || 0} color="bg-yellow-500" />
        <StatCard icon={Building2} label="Companies/Recruiters" value={stats?.totalRecruiters || 0} color="bg-indigo-500" />
      </div>
    </div>
  );
};

export default AnalyticsSection;
