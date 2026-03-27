import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { FileText, Calendar, ClipboardList, Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { PageLoading } from '../../components/ui/PageLoading';

interface ReportFilters {
    startDate: string;
    endDate: string;
    status: string;
}

export default function DoctorReports() {
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('appointments');
    const [reportData, setReportData] = useState<any>(null);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState<ReportFilters>({
        startDate: '',
        endDate: '',
        status: 'all',
    });

    const generateReport = async () => {
        setLoading(true);
        setError('');
        setReportData(null);

        try {
            const params = new URLSearchParams();

            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.status !== 'all') params.append('status', filters.status);

            const queryString = params.toString();

            let endpoint = '';
            switch (reportType) {
                case 'appointments':
                    endpoint = `/reporting/appointments${queryString ? `?${queryString}` : ''}`;
                    break;
                case 'prescriptions':
                    endpoint = `/reporting/prescriptions${queryString ? `?${queryString}` : ''}`;
                    break;
                case 'analytics':
                    endpoint = `/analytics/doctor${queryString ? `?${queryString}` : ''}`;
                    break;
                default:
                    throw new Error('Invalid report type');
            }

            const res = await api.get(endpoint);
            setReportData(res.data);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Failed to generate report';
            setError(message || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const printReport = () => {
        const printContent = document.getElementById('report-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Report - ${reportType}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        table { border-collapse: collapse; width: 100%; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>${printContent.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <p className="text-gray-500 mt-1">Generate practice reports</p>
            </div>

            {/* Report Type Selection */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Select Report Type</h2>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { value: 'appointments', label: 'Appointments', icon: Calendar },
                        { value: 'prescriptions', label: 'Prescriptions', icon: ClipboardList },
                        { value: 'analytics', label: 'Analytics', icon: FileText },
                    ].map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            onClick={() => {
                                setReportType(value);
                                setReportData(null);
                            }}
                            className={`flex items-center gap-2 p-3 rounded-md border transition-colors ${
                                reportType === value
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={generateReport}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-4 w-4" />
                                    Generate Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-md p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Report Results */}
            {reportData && (
                <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-base font-semibold text-gray-800">
                            Report: {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
                        </h2>
                        <button
                            onClick={printReport}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </button>
                    </div>
                    <div id="report-content" className="p-6">
                        {/* Statistics */}
                        {reportData.statistics && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {Object.entries(reportData.statistics).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 rounded-md p-4">
                                        <p className="text-xs text-gray-500 capitalize">{key}</p>
                                        <p className="text-2xl font-bold text-gray-900">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Analytics Stats */}
                        {reportData.totalAppointments !== undefined && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-md p-4">
                                    <p className="text-xs text-gray-500">Total Appointments</p>
                                    <p className="text-2xl font-bold text-gray-900">{reportData.totalAppointments}</p>
                                </div>
                                <div className="bg-gray-50 rounded-md p-4">
                                    <p className="text-xs text-gray-500">Prescriptions</p>
                                    <p className="text-2xl font-bold text-gray-900">{reportData.prescriptionsCount}</p>
                                </div>
                            </div>
                        )}

                        {/* Appointments Data */}
                        {reportData.appointments && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Appointments ({reportData.appointments.length})</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Date</th>
                                                <th className="px-3 py-2 text-left">Patient</th>
                                                <th className="px-3 py-2 text-left">Status</th>
                                                <th className="px-3 py-2 text-left">Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.appointments.slice(0, 20).map((apt: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">
                                                        {apt.appointmentDate ? format(new Date(apt.appointmentDate), 'MMM d, yyyy') : '-'}
                                                    </td>
                                                    <td className="px-3 py-2">{apt.patient || '-'}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                                            apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                            apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                            apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {apt.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">{apt.reasonForVisit || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Prescriptions Data */}
                        {reportData.prescriptions && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Prescriptions ({reportData.prescriptions.length})</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Date</th>
                                                <th className="px-3 py-2 text-left">Patient</th>
                                                <th className="px-3 py-2 text-left">Medications</th>
                                                <th className="px-3 py-2 text-left">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.prescriptions.slice(0, 20).map((presc: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">
                                                        {presc.createdAt ? format(new Date(presc.createdAt), 'MMM d, yyyy') : '-'}
                                                    </td>
                                                    <td className="px-3 py-2">{presc.patient || '-'}</td>
                                                    <td className="px-3 py-2">
                                                        {presc.medications?.map((m: any) => m.medicationName).join(', ') || '-'}
                                                    </td>
                                                    <td className="px-3 py-2">{presc.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
