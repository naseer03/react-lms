import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/report.service';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import { Download, BarChart3, Users, BookOpen, ClipboardList, Award, FileText, Sheet } from 'lucide-react';

const TABS = [
  { id: 'students', label: 'Students', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'tests', label: 'Tests', icon: ClipboardList },
  { id: 'certificates', label: 'Certificates', icon: Award },
];

const COLUMNS = {
  students: [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'mobile', title: 'Mobile' },
    { key: 'status', title: 'Status', render: (v) => <span className={v === 'active' ? 'badge-success' : 'badge-danger'}>{v}</span> },
    { key: 'coursesEnrolled', title: 'Courses' },
    { key: 'avgProgress', title: 'Avg Progress', render: (v) => `${v}%` },
    { key: 'loginCount', title: 'Logins' },
    { key: 'joinedOn', title: 'Joined' },
  ],
  courses: [
    { key: 'title', title: 'Course' },
    { key: 'instructor', title: 'Instructor' },
    { key: 'level', title: 'Level' },
    { key: 'status', title: 'Status', render: (v) => <span className={v === 'published' ? 'badge-success' : 'badge-default'}>{v}</span> },
    { key: 'enrolled', title: 'Enrolled' },
    { key: 'completed', title: 'Completed' },
    { key: 'completionRate', title: 'Completion %' },
    { key: 'lessons', title: 'Lessons' },
  ],
  tests: [
    { key: 'title', title: 'Test' },
    { key: 'course', title: 'Course' },
    { key: 'type', title: 'Type' },
    { key: 'status', title: 'Status', render: (v) => <span className={v === 'published' ? 'badge-success' : 'badge-default'}>{v}</span> },
    { key: 'attempts', title: 'Attempts' },
    { key: 'passed', title: 'Passed' },
    { key: 'passRate', title: 'Pass Rate' },
    { key: 'avgScore', title: 'Avg Score' },
  ],
  certificates: [
    { key: 'certificateNumber', title: 'Cert No.', render: (v) => <span className="font-mono text-xs text-primary-700">{v}</span> },
    { key: 'studentName', title: 'Student' },
    { key: 'email', title: 'Email' },
    { key: 'courseName', title: 'Course' },
    { key: 'completionDate', title: 'Completed' },
    { key: 'issuedAt', title: 'Issued' },
    { key: 'status', title: 'Status', render: (v) => <span className={v === 'active' ? 'badge-success' : 'badge-danger'}>{v}</span> },
  ],
};

const Reports = () => {
  const [tab, setTab] = useState('students');
  const [exporting, setExporting] = useState(null);

  const fetchFns = {
    students: () => reportService.getStudents().then(r => r.data.data.rows),
    courses: () => reportService.getCourses().then(r => r.data.data.rows),
    tests: () => reportService.getTests().then(r => r.data.data.rows),
    certificates: () => reportService.getCertificates().then(r => r.data.data.rows),
  };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['report', tab],
    queryFn: fetchFns[tab],
  });

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const url = format === 'pdf'
        ? reportService.exportPdfUrl(tab)
        : reportService.exportExcelUrl(tab);
      // Trigger download via anchor
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setExporting(null), 2000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">{rows.length} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('excel')} disabled={!!exporting}
            className="btn-secondary flex items-center gap-2">
            {exporting === 'excel' ? <Spinner size="sm" /> : <Download size={14} />}
            Excel
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting}
            className="btn-secondary flex items-center gap-2">
            {exporting === 'pdf' ? <Spinner size="sm" /> : <FileText size={14} />}
            PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white shadow-sm text-primary-700' : 'text-slate-600 hover:text-slate-800'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 capitalize">{tab} Report</p>
          <span className="badge badge-default text-xs">{rows.length} records</span>
        </div>
        <Table
          columns={COLUMNS[tab] || []}
          data={rows}
          loading={isLoading}
          emptyMessage={`No ${tab} data found`}
        />
      </div>
    </div>
  );
};

export default Reports;
