import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../../services/student.service';
import { courseService } from '../../services/course.service';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import { format } from 'date-fns';
import {
  Plus, Search, Filter, MoreVertical, UserX, UserCheck,
  KeyRound, Trash2, Eye, RefreshCw, BookOpen, CheckSquare, Square,
} from 'lucide-react';

const STATUS_COLORS = { active: 'badge-success', blocked: 'badge-danger', pending: 'badge-warning' };

const Students = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMenu, setActionMenu] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // { student }
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]); // for create form
  const [assignCourses, setAssignCourses] = useState([]);    // for assign modal

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, statusFilter],
    queryFn: () =>
      studentService.getStudents({ page, limit: 10, search, status: statusFilter }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  // Fetch all courses for the course selector (limit=200, no status filter = all including drafts)
  const { data: coursesData } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => courseService.getCourses({ limit: 200 }).then((r) => r.data.data?.courses || []),
    staleTime: 5 * 60 * 1000,
  });
  const allCourses = coursesData || [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d) => studentService.createStudent({ ...d, courseIds: selectedCourses }),
    onSuccess: () => {
      toast.success('Student created & welcome email sent');
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['student-stats']);
      setCreateModal(false);
      reset();
      setSelectedCourses([]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create student'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, courseIds }) => studentService.updateStudent(id, { courseIds }),
    onSuccess: () => {
      toast.success('Course enrollment updated');
      queryClient.invalidateQueries(['students']);
      setAssignModal(null);
    },
    onError: () => toast.error('Failed to update enrollment'),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }) => blocked ? studentService.unblockStudent(id) : studentService.blockStudent(id),
    onSuccess: (_, vars) => {
      toast.success(vars.blocked ? 'Student unblocked' : 'Student blocked');
      queryClient.invalidateQueries(['students']);
      setConfirmDialog(null);
    },
    onError: () => toast.error('Action failed'),
  });

  const resetPwMutation = useMutation({
    mutationFn: (id) => studentService.resetPassword(id),
    onSuccess: () => {
      toast.success('New password emailed to student');
      setConfirmDialog(null);
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentService.deleteStudent(id),
    onSuccess: () => {
      toast.success('Student deleted');
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['student-stats']);
      setConfirmDialog(null);
    },
    onError: () => toast.error('Failed to delete student'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleCourse = (id, list, setList) => {
    setList((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const openAssignModal = (student) => {
    const currentIds = (student.enrolledCourses || []).map((e) =>
      typeof e.course === 'object' ? e.course._id : e.course
    );
    setAssignCourses(currentIds);
    setAssignModal(student);
    setActionMenu(null);
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', title: 'Student',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700">{row.name?.[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate max-w-[160px]">{row.name}</p>
            <p className="text-xs text-slate-500 truncate max-w-[160px]">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'mobile', title: 'Mobile', render: (v) => v || '—' },
    {
      key: 'enrolledCourses', title: 'Courses',
      render: (v) => (
        <span className="badge-info">{v?.length || 0} course{v?.length !== 1 ? 's' : ''}</span>
      ),
    },
    {
      key: 'status', title: 'Status',
      render: (v) => <span className={STATUS_COLORS[v] || 'badge-default'}>{v}</span>,
    },
    {
      key: 'createdAt', title: 'Joined',
      render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—',
    },
    {
      key: 'actions', title: '',
      render: (_, row) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === row._id ? null : row._id); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <MoreVertical size={16} />
          </button>
          {actionMenu === row._id && (
            <div
              className="absolute right-0 top-8 w-52 bg-white border border-slate-100 rounded-xl shadow-modal py-1 z-10"
              onMouseLeave={() => setActionMenu(null)}
            >
              <button onClick={() => { setViewModal(row); setActionMenu(null); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Eye size={14} /> View Details
              </button>

              {/* ── Assign Courses ── */}
              <button onClick={() => openAssignModal(row)}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-primary-600 hover:bg-primary-50">
                <BookOpen size={14} /> Assign Courses
              </button>

              <hr className="my-1 border-slate-100" />

              {row.status === 'blocked' ? (
                <button onClick={() => { setConfirmDialog({ type: 'unblock', student: row }); setActionMenu(null); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50">
                  <UserCheck size={14} /> Unblock
                </button>
              ) : (
                <button onClick={() => { setConfirmDialog({ type: 'block', student: row }); setActionMenu(null); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50">
                  <UserX size={14} /> Block
                </button>
              )}
              <button onClick={() => { setConfirmDialog({ type: 'resetpw', student: row }); setActionMenu(null); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                <KeyRound size={14} /> Reset Password
              </button>
              <hr className="my-1 border-slate-100" />
              <button onClick={() => { setConfirmDialog({ type: 'delete', student: row }); setActionMenu(null); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {data?.pagination?.total ?? '—'} students enrolled
          </p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="Search by name, email, or mobile..."
              className="input pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="input pl-9 pr-8 w-full sm:w-40 appearance-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
            className="btn-secondary" title="Reset filters"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <Table columns={columns} data={data?.students || []} loading={isLoading} emptyMessage="No students found" />
        {data?.pagination && (
          <div className="px-4 border-t border-slate-50">
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Create Student Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); reset(); setSelectedCourses([]); }}
        title="Add New Student"
        size="md"
        footer={
          <>
            <button onClick={() => { setCreateModal(false); reset(); setSelectedCourses([]); }} className="btn-secondary">
              Cancel
            </button>
            <button form="create-student-form" type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner size="sm" /> : 'Create Student'}
            </button>
          </>
        }
      >
        <form id="create-student-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input {...register('name', { required: 'Name is required' })}
              className={`input ${errors.name ? 'border-red-400' : ''}`} placeholder="Enter full name" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input
              {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
              type="email" className={`input ${errors.email ? 'border-red-400' : ''}`}
              placeholder="student@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Mobile Number</label>
            <input
              {...register('mobile', { pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid 10-digit mobile' } })}
              type="tel" className={`input ${errors.mobile ? 'border-red-400' : ''}`} placeholder="9876543210"
            />
            {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>}
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Course Assignment at create time */}
          {allCourses.length > 0 && (
            <div>
              <label className="label">Assign Courses <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {allCourses.map((course) => {
                  const checked = selectedCourses.includes(course._id);
                  return (
                    <button
                      key={course._id}
                      type="button"
                      onClick={() => toggleCourse(course._id, selectedCourses, setSelectedCourses)}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                        checked ? 'bg-primary-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {checked
                        ? <CheckSquare size={16} className="text-primary-600 flex-shrink-0" />
                        : <Square size={16} className="text-slate-400 flex-shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{course.title}</p>
                        <p className="text-xs text-slate-500">{course.instructor} · {course.level}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedCourses.length > 0 && (
                <p className="text-xs text-primary-600 mt-1.5 font-medium">
                  {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            A secure password will be auto-generated and emailed to the student.
          </p>
        </form>
      </Modal>

      {/* ── Assign Courses Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Assign Courses — ${assignModal?.name}`}
        size="md"
        footer={
          <>
            <button onClick={() => setAssignModal(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => assignMutation.mutate({ id: assignModal._id, courseIds: assignCourses })}
              className="btn-primary"
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? <Spinner size="sm" /> : 'Save Enrollment'}
            </button>
          </>
        }
      >
        {assignModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Select the courses this student should be enrolled in. Removing a course will unenroll them immediately.
            </p>

            {allCourses.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No courses available yet. Create courses first.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {allCourses.map((course) => {
                  const checked = assignCourses.includes(course._id);
                  return (
                    <button
                      key={course._id}
                      type="button"
                      onClick={() => toggleCourse(course._id, assignCourses, setAssignCourses)}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                        checked ? 'bg-primary-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {checked
                        ? <CheckSquare size={16} className="text-primary-600 flex-shrink-0" />
                        : <Square size={16} className="text-slate-400 flex-shrink-0" />
                      }
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{course.title}</p>
                        <p className="text-xs text-slate-500">{course.instructor} · <span className="capitalize">{course.level}</span></p>
                      </div>
                      {checked && (
                        <span className="text-xs text-primary-600 font-medium bg-primary-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Enrolled
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              <span>{assignCourses.length} course{assignCourses.length !== 1 ? 's' : ''} selected</span>
              {assignCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAssignCourses([])}
                  className="text-red-500 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Student Modal ───────────────────────────────────────────── */}
      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Student Details" size="md">
        {viewModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-700">{viewModal.name[0]}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{viewModal.name}</h3>
                <span className={STATUS_COLORS[viewModal.status] || 'badge-default'}>{viewModal.status}</span>
              </div>
            </div>
            {[
              { label: 'Email', value: viewModal.email },
              { label: 'Mobile', value: viewModal.mobile || '—' },
              { label: 'Enrolled Courses', value: `${viewModal.enrolledCourses?.length || 0} courses` },
              { label: 'Joined', value: viewModal.createdAt ? format(new Date(viewModal.createdAt), 'MMMM d, yyyy') : '—' },
              { label: 'Last Login', value: viewModal.lastLogin ? format(new Date(viewModal.lastLogin), 'MMM d, yyyy HH:mm') : 'Never' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{label}</span>
                <span className="text-slate-800">{value}</span>
              </div>
            ))}
            {viewModal.enrolledCourses?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-slate-500 mb-2">Enrolled Courses</p>
                <div className="space-y-1.5">
                  {viewModal.enrolledCourses.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                      <BookOpen size={14} className="text-primary-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 flex-1">
                        {e.course?.title || 'Unknown Course'}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{e.progress || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Quick assign button from view modal */}
            <button
              onClick={() => { setViewModal(null); openAssignModal(viewModal); }}
              className="btn-secondary w-full mt-2"
            >
              <BookOpen size={14} /> Manage Course Enrollment
            </button>
          </div>
        )}
      </Modal>

      {/* ── Confirm Dialogs ──────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'block'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => blockMutation.mutate({ id: confirmDialog.student._id, blocked: false })}
        loading={blockMutation.isPending}
        title="Block Student"
        message={`Are you sure you want to block "${confirmDialog?.student?.name}"? They will not be able to log in.`}
        confirmLabel="Block" variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'unblock'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => blockMutation.mutate({ id: confirmDialog.student._id, blocked: true })}
        loading={blockMutation.isPending}
        title="Unblock Student"
        message={`Restore access for "${confirmDialog?.student?.name}"?`}
        confirmLabel="Unblock" variant="primary"
      />
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'resetpw'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => resetPwMutation.mutate(confirmDialog.student._id)}
        loading={resetPwMutation.isPending}
        title="Reset Password"
        message={`Generate a new password for "${confirmDialog?.student?.name}" and send it via email?`}
        confirmLabel="Reset & Send Email" variant="primary"
      />
      <ConfirmDialog
        isOpen={confirmDialog?.type === 'delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => deleteMutation.mutate(confirmDialog.student._id)}
        loading={deleteMutation.isPending}
        title="Delete Student"
        message={`Permanently delete "${confirmDialog?.student?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="danger"
      />
    </div>
  );
};

export default Students;
