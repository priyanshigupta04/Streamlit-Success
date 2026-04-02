import React, { useState } from 'react';
import { Search, RefreshCw, Trash2 } from 'lucide-react';

const VALID_ROLES = ['student', 'recruiter', 'mentor', 'internal_guide', 'placement_cell', 'hod', 'dean'];

const UserManagementSection = ({ users, totalUsers, userPages, currentPage, loading, onPageChange, onFilterChange, onSearch, onRefresh, onUserUpdate, onUserDelete }) => {
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(userSearch);
  };

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    onFilterChange(role);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">User Management</h2>
      
      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="text" placeholder="Search by name or email..." className="pl-10 pr-4 py-2 border rounded-lg w-full max-w-md text-sm"
            value={userSearch} onChange={e => setUserSearch(e.target.value)} />
        </form>
        <select className="border rounded-lg px-3 py-2 text-sm" value={roleFilter} onChange={e => handleRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {VALID_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <button onClick={onRefresh} className="p-2 rounded-lg border hover:bg-gray-50">
          <RefreshCw size={18} className="text-gray-500" />
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">Showing {users.length} of {totalUsers} users (Page {currentPage} of {userPages})</p>

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select className="border rounded px-2 py-1 text-xs" value={u.role}
                    onChange={e => onUserUpdate(u._id, e.target.value)}>
                    {VALID_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onUserDelete(u._id, u.name)}
                    className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {userPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
          {Array.from({ length: Math.min(userPages, 5) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => onPageChange(p)}
              className={`px-3 py-1 border rounded text-sm ${currentPage === p ? 'bg-indigo-600 text-white' : ''}`}>{p}</button>
          ))}
          <button onClick={() => onPageChange(Math.min(userPages, currentPage + 1))} disabled={currentPage === userPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default UserManagementSection;
