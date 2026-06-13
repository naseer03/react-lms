import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import { format } from 'date-fns';
import { studentService } from '../../services/student.service';
import {
  Plus, ClipboardList, CheckCircle, Users, BarChart3,
  Pencil, Trash2, Eye, Send, RefreshCw, Search, UserPlus
} from 'lucide-react';

const STATUS_BADGES = {
  draft: 'badge-default',
  published: 'badge-success',
  archived: 'badge-warning',
};

const Tests = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // holds the test being assigned
  const [selectedStudents, setSelectedStudents] = useState([]);

  const { data: stats } = useQuery({
    queryKey: ['test-stats'],
    queryFn: () => testService.getStats().then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tests', page, search, statusFilter],
    queryFn: () => testService.getTests({ page, limit: 10, search, status: statusFilter }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (d) => testService.createTest(d),
    onSuccess: (res) => {
      toast.success('Test created!');
      queryClient.invalidateQueries(['tests']);
      setCreateModal(false);
      reset();
      navigate(`/admin/tests/${res.data.data.test._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => testService.publishTest(id),
    onSuccess: () => { toast.success('Test published'); queryClient.invalidateQueries(['tests']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cannot publish'),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['all-students'],
    queryFn: () => studentService.getStudents({ limit: 200 }).then(r => r.data.data.students),
    enabled: !!assignModal,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, studentIds }) => testService.assignTest(id, studentIds),
    onSuccess: () => { toast.success('Test assigned'); setAssignModal(null); setSelectedStudents([]); },
    onError: () => toast.error('Assign failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => testService.deleteTest(id),
    onSuccess: () => {
      toast.success('Test deleted');
      queryClient.invalidateQueries(['tests']);
      queryClient.invalidateQueries(['test-stats']);
      setConfirmDelete(null);
    },
    onError: () => toast.error('Delete failed'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { duration: 60, passingMarks: 0, maxAttempts: 1, type: 'quiz' }
  });

  const columns = [
    {
      key: 'title', title: 'Test',
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.title}</p>
          <p className="text-xs text-slate-500">{row.type} • {row.questionCount || 0} questions • {row.totalMarks} marks</p>
        </div>
      ),
    },
    { key: 'course', title: 'Course', render: (v) => v?.title || <span className="text-slate-400">General</span> },
    { key: 'duration', title: 'Duration', render: (v) => v > 0 ? `${v} min` : 'Unlimited' },
    { key: 'maxAttempts', title: 'Attempts', render: (v) => v === 0 ? 'Unlimited' : v },
    {
      key: 'status', title: 'Status',
      render: (v) => <span className={STATUS_BADGES[v] || 'badge-default'}>{v}</span>,
    },
    {
      key: 'createdAt', title: 'Created',
      render: (v) => format(new Date(v), 'MMM d, yyyy'),
    },
    {
      key: 'actions', title: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/admin/tests/${row._id}`)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => { setAssignModal(row); setSelectedStudents(row.assignedTo || []); }}
            className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500" title="Assign to students">
            <UserPlus size={14} />
          </button>
          {row.status === 'draft' && (
            <button onClick={() => publishMutation.mutate(row._id)}
              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Publish">
              <Send size={14} />
            </button>
          )}
          <button onClick={() => navigate(`/admin/tests/${row._id}/results`)}
            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="View results">
            <Eye size={14} />
          </button>
          <button onClick={() => setConfirmDelete(row)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tests & Assessments</h1>
          <p className="text-slate-500 text-sm mt-0.5">{data?.pagination?.total ?? '—'} tests total</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus size={16} /> New Test
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tests" value={stats?.total} icon={ClipboardList} color="primary" />
        <StatCard title="Published" value={stats?.published} icon={CheckCircle} color="success" />
        <StatCard title="Attempts" value={stats?.totalAttempts} icon={Users} color="info" />
        <StatCard title="Pass Rate" value={stats?.passRate !== undefined ? `${stats.passRate}%` : '—'} icon={BarChart3} color="warning" />
      </div>

      {/* Filters */}
      <div className="card !p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search tests..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-40 appearance-none" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="btn-secondary">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <Table columns={columns} data={data?.tests || []} loading={isLoading} emptyMessage="No tests yet" />
        {data?.pagination && <div className="px-4 border-t border-slate-50"><Pagination pagination={data.pagination} onPageChange={setPage} /></div>}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => { setCreateModal(false); reset(); }} title="Create New Test" size="lg"
        footer={
          <>
            <button onClick={() => { setCreateModal(false); reset(); }} className="btn-secondary">Cancel</button>
            <button form="create-test-form" type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner size="sm" /> : 'Create & Edit Questions'}
            </button>
          </>
        }
      >
        <form id="create-test-form" onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Test Title *</label>
            <input {...register('title', { required: 'Title is required' })}
              className={`input ${errors.title ? 'border-red-400' : ''}`}
              placeholder="e.g. JavaScript Fundamentals Quiz" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={2} className="input resize-none" placeholder="Test instructions or overview..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select {...register('type')} className="input appearance-none">
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
                <option value="coding">Coding Assessment</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <input {...register('duration', { min: 0 })} type="number" className="input" placeholder="0 = unlimited" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Passing Marks</label>
              <input {...register('passingMarks')} type="number" min="0" className="input" />
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input {...register('maxAttempts')} type="number" min="0" className="input" placeholder="0 = unlimited" />
            </div>
            <div>
              <label className="label">Neg. Mark Value</label>
              <input {...register('negativeMarkValue')} type="number" step="0.25" min="0" max="1" className="input" placeholder="0.25" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { name: 'negativeMarking', label: 'Negative Marking' },
              { name: 'shuffleQuestions', label: 'Shuffle Questions' },
              { name: 'shuffleOptions', label: 'Shuffle Options' },
              { name: 'showResultImmediately', label: 'Show Result Immediately' },
              { name: 'allowReview', label: 'Allow Review' },
            ].map(({ name, label }) => (
              <label key={name} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register(name)} className="w-4 h-4 accent-primary-600" />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="label">Instructions</label>
            <textarea {...register('instructions')} rows={3} className="input resize-none"
              placeholder="Rules and instructions shown to students before the test starts..." />
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={!!assignModal} onClose={() => { setAssignModal(null); setSelectedStudents([]); }}
        title={`Assign "${assignModal?.title}" to Students`} size="lg"
        footer={
          <>
            <button onClick={() => { setAssignModal(null); setSelectedStudents([]); }} className="btn-secondary">Cancel</button>
            <button onClick={() => assignMutation.mutate({ id: assignModal._id, studentIds: selectedStudents })}
              className="btn-primary" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? <Spinner size="sm" /> : 'Save Assignment'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Select students who can take this test:</p>
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {(studentsData || []).map(s => (
              <label key={s._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary-600"
                  checked={selectedStudents.includes(s._id)}
                  onChange={e => setSelectedStudents(prev =>
                    e.target.checked ? [...prev, s._id] : prev.filter(id => id !== s._id)
                  )} />
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </div>
              </label>
            ))}
            {!studentsData?.length && <p className="text-center text-slate-400 py-6 text-sm">No students found</p>}
          </div>
          <p className="text-xs text-slate-400">{selectedStudents.length} student(s) selected</p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete._id)}
        loading={deleteMutation.isPending}
        title="Delete Test"
        message={`Permanently delete "${confirmDelete?.title}" and all its questions and attempts?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Tests;
