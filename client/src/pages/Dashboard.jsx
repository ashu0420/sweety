import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const SLOTS = [
    'Morning (fasting)',
    'After breakfast',
    'After lunch',
    'After dinner',
];

function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const today = getTodayString();

    const [user] = useState(() => {
        const saved = localStorage.getItem('sweety_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Form state (Add & Edit)
    const [editingId, setEditingId] = useState(null);
    const [readingDate, setReadingDate] = useState(today);
    const [slot, setSlot] = useState(SLOTS[0]);
    const [value, setValue] = useState('');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Readings list & pagination state
    const [readings, setReadings] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    });

    // Reports state
    const [reportDate, setReportDate] = useState(today);
    const [reports, setReports] = useState(null);
    const [loadingReports, setLoadingReports] = useState(false);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('sweety_token');
        localStorage.removeItem('sweety_user');
        navigate('/login');
    }, [navigate]);

    const fetchReadings = useCallback(async (targetPage = page) => {
        try {
            const res = await api.get(`/readings?page=${targetPage}&limit=10`);
            setReadings(res.data.readings);
            setPagination(res.data.pagination);
        } catch (err) {
            if (err.response?.status === 401) handleLogout();
        }
    }, [page, handleLogout]);

    const fetchReports = useCallback(async (targetDate = reportDate) => {
        setLoadingReports(true);
        try {
            const res = await api.get(`/reports?date=${targetDate}`);
            setReports(res.data);
        } catch (err) {
            if (err.response?.status === 401) handleLogout();
        } finally {
            setLoadingReports(false);
        }
    }, [reportDate, handleLogout]);

    useEffect(() => {
        fetchReadings(page);
    }, [page, fetchReadings]);

    useEffect(() => {
        fetchReports(reportDate);
    }, [reportDate, fetchReports]);

    const resetForm = () => {
        setEditingId(null);
        setReadingDate(today);
        setSlot(SLOTS[0]);
        setValue('');
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setSubmitting(true);

        try {
            const payload = {
                reading_date: readingDate,
                slot,
                value: value === '' ? '' : Number(value),
            };

            if (editingId) {
                await api.put(`/readings/${editingId}`, payload);
                setFormSuccess('Reading updated successfully.');
            } else {
                await api.post('/readings', payload);
                setFormSuccess('Reading added successfully.');
            }

            resetForm();
            await Promise.all([fetchReadings(page), fetchReports(reportDate)]);
        } catch (err) {
            setFormError(
                err.response?.data?.error || 'Could not save reading. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (reading) => {
        setEditingId(reading.id);
        setReadingDate(reading.reading_date);
        setSlot(reading.slot);
        setValue(String(reading.value));
        setFormError('');
        setFormSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = async (id) => {
        setFormError('');
        setFormSuccess('');
        try {
            await api.delete(`/readings/${id}`);
            if (editingId === id) resetForm();
            setFormSuccess('Reading deleted.');
            await Promise.all([fetchReadings(page), fetchReports(reportDate)]);
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to delete reading.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Top Navbar */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-blue-600">Sweety</h1>
                        <p className="text-xs text-slate-500">Blood Glucose Tracker</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && (
                            <span className="text-sm text-slate-700">
                                Hello, <span className="font-semibold">{user.name}</span>
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Section 1: Add / Edit Reading Form */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            {editingId ? 'Edit Glucose Reading' : 'Log a Glucose Reading'}
                        </h2>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="text-sm text-slate-500 hover:text-slate-800 underline cursor-pointer"
                            >
                                Cancel editing
                            </button>
                        )}
                    </div>

                    {formError && (
                        <div
                            role="alert"
                            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
                        >
                            {formError}
                        </div>
                    )}

                    {formSuccess && !formError && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                            {formSuccess}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                value={readingDate}
                                onChange={(e) => setReadingDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Slot
                            </label>
                            <select
                                value={slot}
                                onChange={(e) => setSlot(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {SLOTS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Glucose Value (mg/dl)
                            </label>
                            <input
                                type="number"
                                placeholder="40 - 600"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition cursor-pointer"
                            >
                                {submitting
                                    ? 'Saving...'
                                    : editingId
                                        ? 'Update Reading'
                                        : 'Add Reading'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Section 2: Reports (Daily, Month-to-Date, Monthly) */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Glucose Reports
                            </h2>
                            <p className="text-xs text-slate-500">
                                Summary statistics anchored to your selected report date
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">
                                Report Date:
                            </label>
                            <input
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {loadingReports || !reports ? (
                        <div className="p-6 bg-white rounded-xl border border-slate-200 text-sm text-slate-500">
                            Loading reports...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Daily Report */}
                            <ReportCard
                                title="Daily Report"
                                subtitle={reports.daily.startDate}
                                stats={reports.daily}
                            >
                                {reports.daily.readings?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                            Readings on this day
                                        </p>
                                        <ul className="space-y-1.5">
                                            {reports.daily.readings.map((r) => (
                                                <li
                                                    key={r.id}
                                                    className="flex items-center justify-between text-sm bg-slate-50 px-3 py-1.5 rounded-lg"
                                                >
                                                    <span className="text-slate-700">{r.slot}</span>
                                                    <span className="font-semibold text-slate-900">
                                                        {r.value} mg/dl
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </ReportCard>

                            {/* Card 2: Month-to-Date Report */}
                            <ReportCard
                                title="Month-to-Date"
                                subtitle={`${reports.monthToDate.startDate} to ${reports.monthToDate.endDate}`}
                                stats={reports.monthToDate}
                            />

                            {/* Card 3: Previous Month Report */}
                            <ReportCard
                                title="Monthly (Previous Month)"
                                subtitle={`${reports.previousMonth.startDate} to ${reports.previousMonth.endDate}`}
                                stats={reports.previousMonth}
                            />
                        </div>
                    )}
                </section>

                {/* Section 3: Readings History Table */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">
                            All Recorded Readings
                        </h2>
                        <span className="text-xs text-slate-500">
                            Total: {pagination.total} readings
                        </span>
                    </div>

                    {readings.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No readings recorded yet. Use the form above to log your first
                            blood glucose reading!
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                                            <th className="py-3 px-6">Date</th>
                                            <th className="py-3 px-6">Slot</th>
                                            <th className="py-3 px-6">Value</th>
                                            <th className="py-3 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-sm">
                                        {readings.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="py-3.5 px-6 font-medium text-slate-900">
                                                    {r.reading_date}
                                                </td>
                                                <td className="py-3.5 px-6 text-slate-700">{r.slot}</td>
                                                <td className="py-3.5 px-6 font-semibold text-blue-600">
                                                    {r.value} mg/dl
                                                </td>
                                                <td className="py-3.5 px-6 text-right space-x-3">
                                                    <button
                                                        onClick={() => handleEditClick(r)}
                                                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(r.id)}
                                                        className="text-red-600 hover:underline font-medium cursor-pointer"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {pagination.totalPages > 1 && (
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm">
                                    <span className="text-slate-600">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <div className="space-x-2">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => p - 1)}
                                            className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50 cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={page >= pagination.totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                            className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50 cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}

function ReportCard({ title, subtitle, stats, children }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>

                {stats.count === 0 ? (
                    <div className="py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500 text-sm">
                        No readings recorded for this period.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Average</p>
                            <p className="text-lg font-bold text-blue-600">
                                {stats.average} <span className="text-xs font-normal">mg/dl</span>
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Readings</p>
                            <p className="text-lg font-bold text-slate-900">{stats.count}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Highest</p>
                            <p className="text-lg font-bold text-amber-600">
                                {stats.highest} <span className="text-xs font-normal">mg/dl</span>
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Lowest</p>
                            <p className="text-lg font-bold text-emerald-600">
                                {stats.lowest} <span className="text-xs font-normal">mg/dl</span>
                            </p>
                        </div>
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}