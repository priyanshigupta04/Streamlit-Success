import React from 'react';

const JobApprovalsSection = ({ pendingJobs, loading, onApprove, onReject, onDataChange }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Job Approvals</h2>
      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading pending jobs...</p>
        ) : (
          <div className="space-y-4">
            {pendingJobs.length === 0 && <p className="text-sm text-gray-500">No pending job approvals</p>}
            {pendingJobs.map(j => (
              <div key={j._id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{j.title} — <span className="text-sm text-gray-500">{j.company}</span></p>
                  <p className="text-sm text-gray-600 mt-1">{j.description?.slice(0, 200)}{j.description && j.description.length > 200 ? '...' : ''}</p>
                  <p className="text-xs text-gray-400 mt-2">Posted by: {j.postedBy?.name || 'Recruiter'} • {new Date(j.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                  <button onClick={() => onApprove(j._id)} 
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                    Approve
                  </button>
                  <button onClick={() => onReject(j._id)} 
                    className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobApprovalsSection;
