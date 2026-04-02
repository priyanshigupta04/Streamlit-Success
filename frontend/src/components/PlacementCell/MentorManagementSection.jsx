import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

const DEPARTMENTS = [
  { id: 'SOCSET', label: 'School of Computer Science & Engineering', short: 'SOCSET' },
  { id: 'SOTE', label: 'School of Transformational Education', short: 'SOTE' },
  { id: 'SOB', label: 'School of Business', short: 'SOB' },
  { id: 'SAAD', label: 'School of Architecture & Applied Design', short: 'SAAD' },
];

const MentorManagementSection = () => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/mentors/departments');
      if (res.data && Array.isArray(res.data)) {
        setMentors(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch mentors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMentorByDept = (deptId) => {
    return mentors.find(m => m.department === deptId);
  };

  const openModal = (mode, dept) => {
    setModalMode(mode);
    setSelectedDept(dept);
    if (mode === 'edit') {
      const existing = getMentorByDept(dept.id);
      if (existing) {
        setFormData({ fullName: existing.mentorName, email: existing.mentorEmail });
      }
    } else {
      setFormData({ fullName: '', email: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ fullName: '', email: '' });
    setSelectedDept(null);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      if (modalMode === 'add') {
        await axios.post('/api/mentors/assign', {
          department: selectedDept.id,
          mentorName: formData.fullName,
          mentorEmail: formData.email,
        });
      } else {
        await axios.put(`/api/mentors/department/${selectedDept.id}`, {
          mentorName: formData.fullName,
          mentorEmail: formData.email,
        });
      }
      await fetchMentors();
      closeModal();
      alert(modalMode === 'add' ? 'Mentor assigned successfully!' : 'Mentor updated successfully!');
    } catch (err) {
      console.error('Mentor save error:', err);
      alert(err.response?.data?.message || `Failed to ${modalMode === 'add' ? 'assign' : 'update'} mentor`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (deptId) => {
    if (!window.confirm('Are you sure you want to remove this mentor assignment?')) return;

    try {
      setLoading(true);
      await axios.delete(`/api/mentors/department/${deptId}`);
      await fetchMentors();
      alert('Mentor assignment removed successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove mentor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mentor Management</h2>
      <p className="text-gray-600 text-sm mb-6">Assign mentors to departments. Mentors will have access only to their assigned department's students.</p>

      {loading && !showModal ? (
        <div className="text-center py-8 text-gray-500">Loading mentors...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {DEPARTMENTS.map(dept => {
            const mentor = getMentorByDept(dept.id);
            return (
              <div key={dept.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-500">
                <h3 className="font-semibold text-gray-800 mb-4">{dept.label}</h3>
                
                {mentor ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Assigned Mentor</p>
                      <p className="text-lg font-semibold text-gray-800">{mentor.mentorName}</p>
                      <p className="text-sm text-gray-600">{mentor.mentorEmail}</p>
                    </div>
                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={() => openModal('edit', dept)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleRemove(dept.id)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm mb-4">No mentor assigned</p>
                    <button
                      onClick={() => openModal('add', dept)}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      <Plus size={16} /> Assign Mentor
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? 'Assign Mentor' : 'Edit Mentor'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {selectedDept && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded">{selectedDept.label}</p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Dr. John Smith"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. john.smith@college.edu"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  <Save size={16} /> {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorManagementSection;
