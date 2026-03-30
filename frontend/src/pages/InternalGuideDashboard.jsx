import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  Users, BookOpen, CheckCircle2, Clock,
  LayoutDashboard, ArrowRight, Search, Eye,
  MessageSquare, Calendar, Trash2,
} from 'lucide-react';

const LOG_STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  needs_revision: 'bg-red-100 text-red-700',
};

const InternalGuideDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [allGuideLogs, setAllGuideLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewComments, setReviewComments] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logStudentFilter, setLogStudentFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logSortOrder, setLogSortOrder] = useState('newest');
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reviewScheduleStudents, setReviewScheduleStudents] = useState([]);
  const [markingAttendanceFor, setMarkingAttendanceFor] = useState(null);
  const [attendanceNotes, setAttendanceNotes] = useState({});
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceFilterMode, setAttendanceFilterMode] = useState('single');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState('');
  const [sharingReport, setSharingReport] = useState(false);
  const [remindingAll, setRemindingAll] = useState(false);
  const [remindingStudentId, setRemindingStudentId] = useState('');
  const [notifyingSchedule, setNotifyingSchedule] = useState(false);

  // Fetch students assigned to this guide
  useEffect(() => {
    fetchStudents();
    fetchAllGuideLogs();
  }, []);

  useEffect(() => {
    fetchReviewSchedule(reviewDate);
  }, [reviewDate]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Get internship forms assigned to this guide to also get company details
      const res = await axios.get('/api/internship-forms');

      const mappedStudents = res.data.map(form => ({
        ...form.student,
        internshipFormId: form._id,
        companyName: form.companyName,
        role: form.role,
        stipend: form.stipend,
        joiningDate: form.joiningDate,
        internshipPeriod: form.internshipPeriod
      }));

      // Keep one row per student in "My Students" list.
      const uniqueByStudent = Object.values(
        mappedStudents.reduce((acc, row) => {
          if (!row?._id) return acc;
          if (!acc[row._id]) acc[row._id] = row;
          return acc;
        }, {})
      );

      setStudents(uniqueByStudent);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGuideLogs = async () => {
    try {
      const res = await axios.get('/api/logs/students');
      setAllGuideLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch all guide logs', err);
    }
  };

  const fetchReviewSchedule = async (dateValue) => {
    try {
      const res = await axios.get(`/api/review-schedule?date=${dateValue}`);
      const studentsForDate = res.data.students || [];
      setReviewScheduleStudents(studentsForDate);
      const noteMap = studentsForDate.reduce((acc, s) => {
        acc[s._id] = s.attendanceNote || '';
        return acc;
      }, {});
      setAttendanceNotes(noteMap);
    } catch (err) {
      console.error('Failed to fetch review schedule', err);
    }
  };

  const formatDateYmd = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const daysSinceDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleAttendanceMark = async (studentId, status) => {
    try {
      setMarkingAttendanceFor(`${studentId}-${status}`);
      await axios.put('/api/review-schedule/attendance', {
        date: reviewDate,
        studentId,
        status,
        note: attendanceNotes[studentId] || '',
      });
      setReviewScheduleStudents((prev) =>
        prev.map((s) => (s._id === studentId ? { ...s, attendanceStatus: status } : s))
      );
      fetchAttendanceHistory(historyDate);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingAttendanceFor(null);
    }
  };

  const fetchAttendanceHistory = async (date = historyDate, mode = attendanceFilterMode) => {
    try {
      const query = mode === 'all' ? '' : `?from=${date}&to=${date}`;
      const res = await axios.get(`/api/review-schedule/history${query}`);
      const records = res.data.records || [];
      setAttendanceHistory(records);
      return records;
    } catch (err) {
      console.error('Failed to fetch attendance history', err);
      return [];
    }
  };

  const applyAttendanceDateFilter = () => {
    fetchAttendanceHistory(historyDate, attendanceFilterMode);
  };

  const deleteAttendanceRecord = async (record) => {
    const label = `${record.studentId?.name || 'Student'} on ${formatDateYmd(record.reviewDate)}`;
    const confirmed = window.confirm(`Delete attendance record for ${label}?`);
    if (!confirmed) return;

    try {
      setDeletingAttendanceId(String(record._id));
      await axios.delete(`/api/review-schedule/history/${record._id}`);
      setAttendanceHistory((prev) => prev.filter((r) => String(r._id) !== String(record._id)));
      setReviewScheduleStudents((prev) =>
        prev.map((s) =>
          String(s._id) === String(record.studentId?._id)
            ? { ...s, attendanceStatus: null, attendanceNote: '' }
            : s
        )
      );
      alert('Attendance record deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete attendance record');
    } finally {
      setDeletingAttendanceId('');
    }
  };

  const notifyWeeklyReviewSchedule = async () => {
    try {
      if (!reviewDate) {
        alert('Please select a review date first');
        return;
      }
      setNotifyingSchedule(true);
      const res = await axios.post('/api/review-schedule/notify', { date: reviewDate });
      alert(res.data?.message || 'Review schedule notification sent');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to notify students');
    } finally {
      setNotifyingSchedule(false);
    }
  };

  const sendLogReminder = async (studentIds = []) => {
    try {
      if (!studentIds.length) return;
      if (studentIds.length > 1) {
        setRemindingAll(true);
      } else {
        setRemindingStudentId(String(studentIds[0]));
      }
      const res = await axios.post('/api/logs/reminder', { studentIds });
      alert(res.data?.message || 'Reminder sent');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setRemindingAll(false);
      setRemindingStudentId('');
    }
  };

  const exportAttendanceCsv = async () => {
    const records = await fetchAttendanceHistory(historyDate, attendanceFilterMode);

    if (records.length === 0) {
      alert('No attendance history to export');
      return;
    }

    const toExcelTextDate = (value) => `'${formatDateYmd(value)}`;

    const header = ['Review Date', 'Student Name', 'Email', 'Department', 'Status', 'Note'];
    const rows = records.map((r) => [
      toExcelTextDate(r.reviewDate),
      r.studentId?.name || '',
      r.studentId?.email || '',
      r.studentId?.department || '',
      r.status || '',
      (r.note || '').replace(/\n/g, ' '),
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attendanceFilterMode === 'all'
      ? 'attendance-history-all-dates.csv'
      : `attendance-history-${historyDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportTodayAttendanceCsv = () => {
    if (!reviewScheduleStudents.length) {
      alert('No students available in today review schedule');
      return;
    }

    const header = ['Date', 'Student Name', 'Email', 'Company', 'Role', 'Attendance Status', 'Note'];
    const excelSafeDate = `'${formatDateYmd(reviewDate)}`;
    const rows = reviewScheduleStudents.map((s) => [
      excelSafeDate,
      s.name || '',
      s.email || '',
      s.companyName || '',
      s.role || '',
      s.attendanceStatus || 'not_marked',
      (attendanceNotes[s._id] || s.attendanceNote || '').replace(/\n/g, ' '),
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `today-attendance-${reviewDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareAttendanceReport = async () => {
    const records = await fetchAttendanceHistory(historyDate, attendanceFilterMode);
    if (!records.length) {
      alert('No attendance records to share');
      return;
    }

    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    try {
      setSharingReport(true);
      const payload = {
        mode: attendanceFilterMode,
        date: historyDate,
        total: records.length,
        present,
        absent,
      };
      const res = await axios.post('/api/review-schedule/share-report', payload);
      alert(res.data?.message || 'Attendance report shared with Dean/HOD');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to share attendance report');
    } finally {
      setSharingReport(false);
    }
  };

  const fetchStudentLogs = async (studentId) => {
    try {
      const res = await axios.get(`/api/logs/student/${studentId}`);
      setLogs(res.data.logs);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const handleReviewLog = async (logId, status) => {
    try {
      const comment = reviewComments[logId] || '';
      await axios.put(`/api/logs/${logId}/review`, {
        status,
        guideComment: comment,
      });
      setReviewComments((prev) => ({ ...prev, [logId]: '' }));
      if (selectedStudent) fetchStudentLogs(selectedStudent._id);
      fetchAllGuideLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Review failed');
    }
  };

  const viewStudentLogs = (student) => {
    setSelectedStudent(student);
    fetchStudentLogs(student._id);
    setActiveTab('logs');
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'weeklyReview', label: 'Weekly Review', icon: Calendar },
    { key: 'students', label: 'My Students', icon: Users },
    { key: 'logs', label: 'Weekly Logs', icon: BookOpen },
  ];

  const normalizedFrom = logDateFrom ? new Date(logDateFrom) : null;
  const normalizedTo = logDateTo ? new Date(logDateTo) : null;
  if (normalizedTo) normalizedTo.setHours(23, 59, 59, 999);

  const filteredGuideLogs = allGuideLogs
    .filter((log) => {
      if (logStatusFilter !== 'all' && log.status !== logStatusFilter) return false;
      if (logStudentFilter !== 'all' && String(log.studentId?._id) !== logStudentFilter) return false;
      if (weekFilter && String(log.weekNumber) !== String(weekFilter)) return false;

      const created = new Date(log.createdAt);
      if (normalizedFrom && created < normalizedFrom) return false;
      if (normalizedTo && created > normalizedTo) return false;
      return true;
    })
    .sort((a, b) => {
      if (logSortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (logSortOrder === 'weekAsc') return (a.weekNumber || 0) - (b.weekNumber || 0);
      if (logSortOrder === 'weekDesc') return (b.weekNumber || 0) - (a.weekNumber || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const latestLogByStudent = allGuideLogs.reduce((acc, log) => {
    const sid = String(log.studentId?._id || '');
    if (!sid) return acc;
    if (!acc[sid] || new Date(log.createdAt) > new Date(acc[sid].createdAt)) {
      acc[sid] = log;
    }
    return acc;
  }, {});

  const riskStudents = students
    .map((s) => {
      const latest = latestLogByStudent[String(s._id)] || null;
      const daysSince = latest ? Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
      return { ...s, latestLog: latest, daysSinceLastLog: daysSince };
    })
    .filter((s) => !s.latestLog || s.daysSinceLastLog > 7);

  const pendingLogs = allGuideLogs.filter((l) => ['submitted', 'under_review'].includes(l.status));
  const stalePendingLogsCount = pendingLogs.filter((l) => (daysSinceDate(l.createdAt) || 0) > 3).length;
  const pendingLogStudentIds = [...new Set(
    pendingLogs
      .map((l) => String(l.studentId?._id || ''))
      .filter(Boolean)
  )];
  const topFollowUpStudents = riskStudents.slice(0, 5);

  const getFollowUpReason = (student) => {
    if (!student.latestLog) return 'No log submitted yet';
    if (student.daysSinceLastLog > 14) return `No updates for ${student.daysSinceLastLog} days`;
    return `No recent log (${student.daysSinceLastLog} days)`;
  };


  const studentOptions = students.map((s) => ({ id: String(s._id), name: s.name }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-white/80 backdrop-blur border-r border-slate-200 min-h-[calc(100vh-64px)] p-5 shadow-sm">
          <div className="mb-7 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mb-1">Guide Workspace</p>
            <h3 className="font-black text-slate-800 text-lg leading-tight">{user?.name}</h3>
            <p className="text-xs text-slate-500 mt-1">Internal Guide</p>
          </div>
          <nav className="space-y-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === t.key ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 md:p-8">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Internal Guide Dashboard</h2>
                <p className="text-sm text-slate-600 mt-1">Track student engagement, weekly logs and attendance in one place.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={Users} label="My Students" value={students.length} color="bg-blue-500" />
                <StatCard icon={BookOpen} label="Pending Logs" value={allGuideLogs.filter(l => ['submitted', 'under_review'].includes(l.status)).length} color="bg-yellow-500" />
                <StatCard icon={CheckCircle2} label="Reviewed" value={allGuideLogs.filter(l => ['approved', 'needs_revision'].includes(l.status)).length} color="bg-green-500" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3">Today's Priority</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      <span className="text-slate-600">Logs pending review</span>
                      <span className="font-bold text-slate-900">{pendingLogs.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      <span className="text-slate-600">Pending for more than 3 days</span>
                      <span className="font-bold text-amber-700">{stalePendingLogsCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      <span className="text-slate-600">Today's attendance not marked</span>
                      <span className="font-bold text-rose-700">{reviewScheduleStudents.filter((s) => !s.attendanceStatus).length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => sendLogReminder(pendingLogStudentIds)}
                      disabled={pendingLogStudentIds.length === 0 || remindingAll}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {remindingAll ? 'Sending...' : 'Remind Pending'}
                    </button>
                    <button
                      onClick={() => setActiveTab('weeklyReview')}
                      className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black"
                    >
                      Open Weekly Review
                    </button>
                    <button
                      onClick={exportTodayAttendanceCsv}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                    >
                      Export Today Attendance
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Students Requiring Follow-up (No recent logs)</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">{riskStudents.length} need attention</span>
                    {riskStudents.length > 0 && (
                      <button
                        onClick={() => sendLogReminder(riskStudents.map((s) => s._id))}
                        disabled={remindingAll}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {remindingAll ? 'Sending...' : 'Remind All'}
                      </button>
                    )}
                  </div>
                </div>
                {riskStudents.length === 0 ? (
                  <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">Great! All assigned students have submitted logs recently.</p>
                ) : (
                  <div className="space-y-3">
                    {topFollowUpStudents.map((s) => (
                      <div key={s._id} className="flex items-center justify-between p-3 border border-rose-100 rounded-xl bg-rose-50/40">
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-600">{s.email}</p>
                          <p className="text-xs text-rose-700 mt-1">{getFollowUpReason(s)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-rose-700">
                            {!s.latestLog ? 'No log submitted yet' : `${s.daysSinceLastLog} days since last log`}
                          </p>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <button
                              onClick={() => sendLogReminder([s._id])}
                              disabled={remindingStudentId === String(s._id)}
                              className="text-xs px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 font-semibold hover:bg-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {remindingStudentId === String(s._id) ? 'Sending...' : 'Reminder'}
                            </button>
                            <button onClick={() => viewStudentLogs(s)} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">
                              Review Now <ArrowRight size={12} className="inline" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {riskStudents.length > 5 && (
                      <button
                        onClick={() => setActiveTab('students')}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        View all students
                      </button>
                    )}
                  </div>
                )}
              </div>

              {students.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-slate-500">No students assigned yet</p>
                </div>
              )}
            </div>
          )}

          {/* WEEKLY REVIEW TAB */}
          {activeTab === 'weeklyReview' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900">Weekly Review</h2>
                <p className="text-sm text-slate-500 mt-1">Schedule reviews, notify students, and mark attendance from one place.</p>
              </div>

              {students.length > 0 ? (
                <>
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                      <h3 className="font-semibold text-slate-800">Weekly Review Schedule</h3>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={reviewDate}
                          onChange={(e) => setReviewDate(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                          onClick={notifyWeeklyReviewSchedule}
                          disabled={notifyingSchedule}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          {notifyingSchedule ? 'Scheduling...' : 'Schedule & Notify'}
                        </button>
                      </div>
                    </div>

                    {reviewScheduleStudents.length === 0 ? (
                      <p className="text-sm text-slate-500">No students assigned for weekly review schedule on this date.</p>
                    ) : (
                      reviewScheduleStudents.map((s) => (
                        <div key={s._id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 gap-3">
                          <div>
                            <p className="font-semibold text-slate-800">{s.name}</p>
                            <p className="text-sm text-slate-500">{s.email}</p>
                            {s.companyName && (
                              <p className="text-xs text-indigo-600 mt-1">{s.companyName} • {s.role}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Attendance note (optional)"
                              value={attendanceNotes[s._id] || ''}
                              onChange={(e) => setAttendanceNotes((prev) => ({ ...prev, [s._id]: e.target.value }))}
                              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-52"
                            />
                            <button
                              onClick={() => handleAttendanceMark(s._id, 'present')}
                              disabled={markingAttendanceFor === `${s._id}-present`}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${s.attendanceStatus === 'present' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              {markingAttendanceFor === `${s._id}-present` ? 'Saving...' : 'Present'}
                            </button>
                            <button
                              onClick={() => handleAttendanceMark(s._id, 'absent')}
                              disabled={markingAttendanceFor === `${s._id}-absent`}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${s.attendanceStatus === 'absent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              {markingAttendanceFor === `${s._id}-absent` ? 'Saving...' : 'Absent'}
                            </button>
                            <button onClick={() => viewStudentLogs(s)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                              View Logs <ArrowRight size={14} className="inline" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                      <h3 className="font-bold text-slate-800">Attendance History</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={attendanceFilterMode}
                          onChange={(e) => setAttendanceFilterMode(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                        >
                          <option value="single">Selected Date</option>
                          <option value="all">All Attendance</option>
                        </select>
                        <input
                          type="date"
                          value={historyDate}
                          onChange={(e) => setHistoryDate(e.target.value)}
                          disabled={attendanceFilterMode === 'all'}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                          onClick={applyAttendanceDateFilter}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Apply Filter
                        </button>
                        <button
                          onClick={exportAttendanceCsv}
                          className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={shareAttendanceReport}
                          disabled={sharingReport}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {sharingReport ? 'Sending...' : 'Send to Dean & HOD'}
                        </button>
                      </div>
                    </div>

                    {attendanceHistory.length === 0 ? (
                      <p className="text-sm text-slate-500">No attendance records found in selected date range.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-100">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Student</th>
                              <th className="py-2 pr-4">Email</th>
                              <th className="py-2 pr-4">Status</th>
                              <th className="py-2 pr-4">Note</th>
                              <th className="py-2 pr-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistory.map((item) => (
                              <tr key={item._id} className="border-b border-slate-100 last:border-0">
                                <td className="py-2 pr-4">{formatDateYmd(item.reviewDate)}</td>
                                <td className="py-2 pr-4">{item.studentId?.name || 'Unknown'}</td>
                                <td className="py-2 pr-4">{item.studentId?.email || '-'}</td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-xs text-slate-600">{item.note || '-'}</td>
                                <td className="py-2 pr-2 text-right">
                                  <button
                                    onClick={() => deleteAttendanceRecord(item)}
                                    disabled={deletingAttendanceId === String(item._id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 size={13} />
                                    {deletingAttendanceId === String(item._id) ? 'Deleting...' : 'Delete'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-slate-500">No students assigned yet</p>
                </div>
              )}
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900">My Students</h2>
                <p className="text-sm text-slate-500 mt-1">Track assigned interns, their companies and quick log access.</p>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" placeholder="Search students..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-full max-w-md text-sm bg-white"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <div key={s._id} className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{s.name}</h3>
                        <p className="text-sm text-slate-500">{s.email}</p>
                        {s.department && <p className="text-xs text-slate-400 mt-1">{s.department}</p>}
                        
                        {s.companyName && (
                          <div className="mt-2 text-sm bg-blue-50 p-2 rounded-lg text-blue-800 border border-blue-100">
                            Interning at <span className="font-semibold">{s.companyName}</span> as {s.role}
                          </div>
                        )}
                      </div>
                      <button onClick={() => viewStudentLogs(s)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100">
                        <Eye size={14} className="inline mr-1" /> Logs
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {students.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-slate-500">No students assigned to you yet</p>
                </div>
              )}
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900">Weekly Logs</h2>
                <p className="text-sm text-slate-500 mt-1">Filter, review and resolve submitted logs with feedback.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <select
                    value={logStatusFilter}
                    onChange={(e) => setLogStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="needs_revision">Needs Revision</option>
                  </select>
                  <select
                    value={logStudentFilter}
                    onChange={(e) => setLogStudentFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                  >
                    <option value="all">All Students</option>
                    {studentOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Week #"
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input type="date" value={logDateFrom} onChange={(e) => setLogDateFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="date" value={logDateTo} onChange={(e) => setLogDateTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <select
                    value={logSortOrder}
                    onChange={(e) => setLogSortOrder(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="weekDesc">Week High-Low</option>
                    <option value="weekAsc">Week Low-High</option>
                  </select>
                  <button
                    onClick={fetchAllGuideLogs}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Refresh Logs
                  </button>
                </div>
              </div>

              {/* Separate section: all weekly logs from all assigned students */}
              {filteredGuideLogs.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                  <p className="text-slate-500">No weekly logs found for selected status.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGuideLogs.map(log => (
                    <div key={log._id} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 mb-1">
                            Student: {log.studentId?.name || 'Unknown'}
                          </p>
                          <h3 className="font-semibold text-slate-800">Week {log.weekNumber}: {log.title}</h3>
                          <p className="text-sm text-slate-500 flex items-center gap-3">
                            <span><Clock size={14} className="inline mr-1" />{log.hoursWorked}h worked</span>
                            <span><Calendar size={14} className="inline mr-1" />{new Date(log.createdAt).toLocaleDateString()}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${LOG_STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-500'}`}>
                            {log.status.replace('_', ' ')}
                          </span>
                          {['submitted', 'under_review'].includes(log.status) && (
                            <p className="text-xs text-amber-700 font-semibold mt-1">
                              Pending for {daysSinceDate(log.createdAt)} day(s)
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl mb-4 whitespace-pre-wrap">{log.logText}</p>

                      {log.guideComment && (
                        <div className="bg-indigo-50 p-3 rounded-lg mb-4">
                          <p className="text-xs font-medium text-indigo-600 mb-1">Your Comment:</p>
                          <p className="text-sm text-indigo-800">{log.guideComment}</p>
                        </div>
                      )}

                      {(log.status === 'submitted' || log.status === 'under_review') && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <input type="text" placeholder="Add feedback..." className="flex-1 min-w-[220px] border border-slate-200 rounded-lg p-2 text-sm"
                            value={reviewComments[log._id] || ''}
                            onChange={e => setReviewComments((prev) => ({ ...prev, [log._id]: e.target.value }))} />
                          <button onClick={() => handleReviewLog(log._id, 'approved')}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button onClick={() => handleReviewLog(log._id, 'needs_revision')}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 flex items-center gap-1">
                            <MessageSquare size={14} /> Revise
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
    <div className={`${color} p-3 rounded-xl text-white shadow-sm`}><Icon size={22} /></div>
    <div>
      <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">{label}</p>
    </div>
  </div>
);

export default InternalGuideDashboard;
