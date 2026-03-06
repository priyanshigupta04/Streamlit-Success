import React, { useState } from 'react';
import axios from '../../api/axios';
import { Send } from 'lucide-react';

const VALID_ROLES = ['student', 'recruiter', 'mentor', 'internal_guide', 'placement_cell', 'hod', 'dean'];

const BroadcastSection = () => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRole, setBroadcastRole] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      alert('Title and message are required');
      return;
    }
    try {
      setLoading(true);
      const payload = { title: broadcastTitle, message: broadcastMessage };
      if (broadcastRole) payload.targetRole = broadcastRole;
      await axios.post('/api/notifications/broadcast', payload);
      alert('Broadcast sent successfully!');
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastRole('');
    } catch (err) {
      alert('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Send Broadcast</h2>
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" className="w-full border rounded-lg p-2 text-sm" value={broadcastTitle}
              onChange={e => setBroadcastTitle(e.target.value)} placeholder="e.g. Important: Campus Drive Update"
              disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea className="w-full border rounded-lg p-2 text-sm" rows={4} value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)} placeholder="Enter your announcement message..."
              disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={broadcastRole} onChange={e => setBroadcastRole(e.target.value)}
              disabled={loading}>
              <option value="">All Users</option>
              {VALID_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button onClick={handleBroadcast}
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-50">
            <Send size={16} /> {loading ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BroadcastSection;
