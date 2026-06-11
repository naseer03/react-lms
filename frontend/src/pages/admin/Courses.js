import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../../services/course.service';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import CourseCard from '../../components/course/CourseCard';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import { Plus, Search, Filter, RefreshCw, BookOpen } from 'lucide-react';

const Courses = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search, statusFilter],
    queryFn: () => courseService.getCourses({ page, limit: 12, search, status: statusFilter }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (d) => courseService.createCourse(d),
    onSuccess: (res) => {
      toast.success('Course created!');
      queryClient.invalidateQueries(['courses']);
      setCreateModal(false);
      reset();
      navigate(`/admin/courses/${res.data.data.course._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { status: 'draft', level: 'beginner' }
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Courses</h1>
          <p className="text-slate-500 text-sm mt-0.5">{data?.pagination?.total ?? '—'} courses</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus size={16} /> New Course
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-full sm:w-40 appearance-none"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }} className="btn-secondary">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="skeleton h-40 rounded-none" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.courses?.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No courses yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first course to get started</p>
          <button onClick={() => setCreateModal(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={16} /> Create Course
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.courses?.map((course) => (
              <CourseCard key={course._id} course={course} isAdmin />
            ))}
          </div>
          {data?.pagination && (
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Create Course Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); reset(); }}
        title="Create New Course"
        size="md"
        footer={
          <>
            <button onClick={() => { setCreateModal(false); reset(); }} className="btn-secondary">Cancel</button>
            <button form="create-course-form" type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner size="sm" /> : 'Create Course'}
            </button>
          </>
        }
      >
        <form id="create-course-form" onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Course Title *</label>
            <input {...register('title', { required: 'Title is required' })}
              className={`input ${errors.title ? 'border-red-400' : ''}`}
              placeholder="e.g. Full Stack Web Development" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea {...register('description', { required: 'Description is required' })}
              rows={3} className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
              placeholder="Brief course description..." />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Instructor *</label>
              <input {...register('instructor', { required: true })}
                className="input" placeholder="Instructor name" />
            </div>
            <div>
              <label className="label">Category</label>
              <input {...register('category')} className="input" placeholder="e.g. Web Dev" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Level</label>
              <select {...register('level')} className="input appearance-none">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input appearance-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Courses;
