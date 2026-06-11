import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificateService } from '../../services/certificate.service';
import { courseService } from '../../services/course.service';
import { studentService } from '../../services/student.service';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Award, Plus, Download, Ban, Search, RefreshCw, CheckCircle } from 'lucide-react';

const Certificates = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [generateModal, setGenerateModal] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState(null);
  const [genForm, setGenForm] = useState({ studentId: '', courseId: '' });
  const [revokeReason, setRevokeReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['cert-stats'],
    queryFn: () => certificateService.getStats().then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', page, search],
    queryFn: () => certificateService.getAll({ page, limit: 10, search }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.getStudents({ limit: 200 }).then(r => r.data.data),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => courseService.getCourses({ limit: 100, status: 'published' }).then(r => r.data.data),
  });

  const generateMutation = useMutation({
    mutationFn: (d) => certificateService.generate(d),
    onSuccess: () => {
      toast.success('Certificate generated and emailed to student!');
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['cert-stats']);
      setGenerateModal(false);
      setGenForm({ studentId: '', courseId: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Generation failed'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => certificateService.revoke(revokeDialog._id, revokeReason),
    onSuccess: () => {
      toast.success('Certificate revoked');
      queryClient.invalidateQueries(['certificates']);
      setRevokeDialog(null);
      setRevokeReason('');
    },
    onError: () => toast.error('Revocation failed'),
  });

  const columns = [
    {
      key: 'certificateNumber', title: 'Certificate',
      render: (num, row) => (
        <div>
          <p className="font-mono text-sm font-semibold text-primary-700">{num}</p>
          <p className="text-xs text-slate-500">{row.studentName}</p>
        </div>
      ),
    },
    { key: 'courseName', title: 'Course', render: (v) => <span className="text-sm">{v}</span> },
    {
      key: 'completionDate', title: 'Completed',
      render: (v) => v ? format(new Date(v), 'dd MMM yyyy') : '—',
    },
    {
      key: 'issuedAt', title: 'Issued',
      render: (v) => v ? format(new Date(v), 'dd MMM yyyy') : '—',
    },
    {
      key: 'status', title: 'Status',
      render: (v) => <span className={v === 'active' ? 'badge-success' : 'badge-danger'}>{v}</span>,
    },
    {
      key: 'actions', title: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <a href={certificateService.downloadUrl(row._id)} target="_blank" rel="noreferrer"
            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Download PDF">
            <Download size={14} />
          </a>
          {row.status === 'active' && (
            <button onClick={() => setRevokeDialog(row)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Revoke">
              <Ban size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Certificates</h1>
          <p className="text-slate-500 text-sm mt-0.5">{data?.pagination?.total ?? '—'} issued</p>
        </div>
        <button onClick={() => setGenerateModal(true)} className="btn-primary">
          <Plus size={16} /> Generate Certificate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Certificates" value={stats?.total} icon={Award} color="purple" />
        <StatCard title="This Month" value={stats?.thisMonth} icon={CheckCircle} color="success" />
      </div>

      {/* Filters */}
      <div className="card !p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, cert number, course..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={() => { setSearch(''); setPage(1); }} className="btn-secondary"><RefreshCw size={14} /></button>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <Table columns={columns} data={data?.certificates || []} loading={isLoading} emptyMessage="No certificates issued yet" />
        {data?.pagination && <div className="px-4 border-t border-slate-50"><Pagination pagination={data.pagination} onPageChange={setPage} /></div>}
      </div>

      {/* Generate Modal */}
      <Modal isOpen={generateModal} onClose={() => { setGenerateModal(false); setGenForm({ studentId: '', courseId: '' }); }}
        title="Generate Certificate" size="sm"
        footer={
          <>
            <button onClick={() => setGenerateModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => generateMutation.mutate(genForm)}
              disabled={!genForm.studentId || !genForm.courseId || generateMutation.isPending}
              className="btn-primary">
              {generateMutation.isPending ? <Spinner size="sm" /> : 'Generate & Email'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Student *</label>
            <select className="input appearance-none" value={genForm.studentId}
              onChange={(e) => setGenForm(p => ({ ...p, studentId: e.target.value }))}>
              <option value="">Select student...</option>
              {studentsData?.students?.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Course *</label>
            <select className="input appearance-none" value={genForm.courseId}
              onChange={(e) => setGenForm(p => ({ ...p, courseId: e.target.value }))}>
              <option value="">Select course...</option>
              {coursesData?.courses?.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            A PDF certificate will be generated and emailed to the student automatically.
          </p>
        </div>
      </Modal>

      {/* Revoke Dialog */}
      <ConfirmDialog
        isOpen={!!revokeDialog}
        onClose={() => { setRevokeDialog(null); setRevokeReason(''); }}
        onConfirm={() => revokeMutation.mutate()}
        loading={revokeMutation.isPending}
        title="Revoke Certificate"
        message={
          <div className="space-y-3">
            <p>Revoke certificate <strong>{revokeDialog?.certificateNumber}</strong> issued to <strong>{revokeDialog?.studentName}</strong>?</p>
            <div>
              <label className="label">Reason for revocation</label>
              <textarea className="input resize-none" rows={2} value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)} placeholder="Enter reason..." />
            </div>
          </div>
        }
        confirmLabel="Revoke"
        variant="danger"
      />
    </div>
  );
};

export default Certificates;
