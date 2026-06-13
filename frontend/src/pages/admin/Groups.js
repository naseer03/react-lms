import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import { groupService } from '../../services/group.service';
import { studentService } from '../../services/student.service';
import { courseService } from '../../services/course.service';
import { testService } from '../../services/test.service';
import { Plus, Pencil, Trash2, Users, BookOpen, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';

const Groups = () => {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [studentsModal, setStudentsModal] = useState(null);
  const [coursesModal, setCoursesModal] = useState(null);
  const [testsModal, setTestsModal] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getGroups().then(r => r.data.data.groups),
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ['all-students'],
    queryFn: () => studentService.getStudents({ limit: 500 }).then(r => r.data.data.students),
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['all-courses'],
    queryFn: () => courseService.getCourses({ limit: 1000 }).then(r => r.data.data.courses),
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ['all-tests'],
    queryFn: () => testService.getTests({ limit: 1000 }).then(r => r.data.data.tests),
  });

  const createMutation = useMutation({
    mutationFn: (d) => groupService.createGroup(d),
    onSuccess: () => {
      toast.success('Group created');
      queryClient.invalidateQueries(['groups']);
      setCreateModal(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => groupService.updateGroup(id, data),
    onSuccess: () => {
      toast.success('Group updated');
      queryClient.invalidateQueries(['groups']);
      setEditModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => groupService.deleteGroup(id),
    onSuccess: () => {
      toast.success('Group deleted');
      queryClient.invalidateQueries(['groups']);
      setConfirmDelete(null);
    },
  });

  const studentsMutation = useMutation({
    mutationFn: ({ id, studentIds }) => groupService.updateStudents(id, studentIds),
    onSuccess: () => {
      toast.success('Students updated');
      queryClient.invalidateQueries(['groups']);
      setStudentsModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const coursesMutation = useMutation({
    mutationFn: ({ id, courseIds }) => groupService.assignCourses(id, courseIds),
    onSuccess: () => {
      toast.success('Courses assigned & students enrolled');
      queryClient.invalidateQueries(['groups']);
      setCoursesModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const testsMutation = useMutation({
    mutationFn: ({ id, testIds }) => groupService.assignTests(id, testIds),
    onSuccess: () => {
      toast.success('Tests assigned');
      queryClient.invalidateQueries(['groups']);
      setTestsModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openEdit = (group) => {
    setEditModal(group);
    setValue('name', group.name);
    setValue('description', group.description || '');
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Groups</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage student groups and assign courses & tests</p>
        </div>
        <button
          onClick={() => { reset(); setCreateModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No groups yet</p>
          <p className="text-slate-400 text-sm">Create a group to start assigning courses and tests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group._id} className="card p-0 overflow-hidden">
              {/* Group header row */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{group.name}</h3>
                  {group.description && <p className="text-sm text-slate-500 truncate">{group.description}</p>}
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-400">{group.students?.length || 0} students</span>
                    <span className="text-xs text-slate-400">{group.assignedCourses?.length || 0} courses</span>
                    <span className="text-xs text-slate-400">{group.assignedTests?.length || 0} tests</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStudentsModal(group)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                    title="Manage Students"
                  >
                    <Users size={16} />
                  </button>
                  <button
                    onClick={() => setCoursesModal(group)}
                    className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                    title="Assign Courses"
                  >
                    <BookOpen size={16} />
                  </button>
                  <button
                    onClick={() => setTestsModal(group)}
                    className="p-2 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                    title="Assign Tests"
                  >
                    <ClipboardList size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(group)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(group)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setExpandedGroup(expandedGroup === group._id ? null : group._id)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    {expandedGroup === group._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedGroup === group._id && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Students</p>
                    {group.students?.length === 0 ? (
                      <p className="text-sm text-slate-400">None</p>
                    ) : (
                      <div className="space-y-1">
                        {group.students?.map(s => (
                          <div key={s._id} className="text-sm text-slate-700 flex items-center gap-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">{s.name?.[0]}</span>
                            </div>
                            {s.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Courses</p>
                    {group.assignedCourses?.length === 0 ? (
                      <p className="text-sm text-slate-400">None</p>
                    ) : (
                      <div className="space-y-1">
                        {group.assignedCourses?.map(c => (
                          <div key={c._id} className="text-sm text-slate-700 flex items-center gap-2">
                            <BookOpen size={13} className="text-green-500 flex-shrink-0" />
                            {c.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Tests</p>
                    {group.assignedTests?.length === 0 ? (
                      <p className="text-sm text-slate-400">None</p>
                    ) : (
                      <div className="space-y-1">
                        {group.assignedTests?.map(t => (
                          <div key={t._id} className="text-sm text-slate-700 flex items-center gap-2">
                            <ClipboardList size={13} className="text-purple-500 flex-shrink-0" />
                            {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Group">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="form-label">Group Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="input"
              placeholder="e.g. Batch A 2024"
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              {...register('description')}
              className="input"
              rows={3}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Group">
        <form onSubmit={handleSubmit(d => updateMutation.mutate({ id: editModal?._id, data: d }))} className="space-y-4">
          <div>
            <label className="form-label">Group Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="input"
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="input" rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Students Modal */}
      {studentsModal && (
        <MultiSelectModal
          isOpen
          onClose={() => { setStudentsModal(null); setModalSearch(''); }}
          title={`Manage Students — ${studentsModal.name}`}
          allItems={allStudents}
          selectedIds={studentsModal.students?.map(s => s._id?.toString()) || []}
          idKey="_id"
          labelKey="name"
          subLabelKey="email"
          search={modalSearch}
          onSearch={setModalSearch}
          onSave={(ids) => studentsMutation.mutate({ id: studentsModal._id, studentIds: ids })}
          saving={studentsMutation.isPending}
          icon={<Users size={14} className="text-blue-500" />}
        />
      )}

      {/* Courses Modal */}
      {coursesModal && (
        <MultiSelectModal
          isOpen
          onClose={() => { setCoursesModal(null); setModalSearch(''); }}
          title={`Assign Courses — ${coursesModal.name}`}
          allItems={allCourses}
          selectedIds={coursesModal.assignedCourses?.map(c => c._id?.toString()) || []}
          idKey="_id"
          labelKey="title"
          search={modalSearch}
          onSearch={setModalSearch}
          onSave={(ids) => coursesMutation.mutate({ id: coursesModal._id, courseIds: ids })}
          saving={coursesMutation.isPending}
          icon={<BookOpen size={14} className="text-green-500" />}
          note="Students in this group will be automatically enrolled in selected courses."
        />
      )}

      {/* Tests Modal */}
      {testsModal && (
        <MultiSelectModal
          isOpen
          onClose={() => { setTestsModal(null); setModalSearch(''); }}
          title={`Assign Tests — ${testsModal.name}`}
          allItems={allTests}
          selectedIds={testsModal.assignedTests?.map(t => t._id?.toString()) || []}
          idKey="_id"
          labelKey="title"
          search={modalSearch}
          onSearch={setModalSearch}
          onSave={(ids) => testsMutation.mutate({ id: testsModal._id, testIds: ids })}
          saving={testsMutation.isPending}
          icon={<ClipboardList size={14} className="text-purple-500" />}
          note="Students in this group will be automatically assigned these tests."
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete._id)}
        title="Delete Group"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This will not unenroll students.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

const MultiSelectModal = ({ isOpen, onClose, title, allItems, selectedIds, idKey, labelKey, subLabelKey, search, onSearch, onSave, saving, icon, note }) => {
  // selected state lives here; it resets each mount (modal conditionally renders so this is fine)
  const [selected, setSelected] = useState(() => new Set(selectedIds));

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const q = (search || '').toLowerCase();
  const filtered = allItems.filter(item => {
    const label = (item[labelKey] || '').toLowerCase();
    const sub = subLabelKey ? (item[subLabelKey] || '').toLowerCase() : '';
    return !q || label.includes(q) || sub.includes(q);
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3">
        {note && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">{note}</p>
        )}
        <input
          className="input"
          placeholder={`Search ${allItems.length} items by name or email...`}
          value={search || ''}
          onChange={e => onSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-72 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              {q ? `No results for "${search}"` : 'No items available'}
            </p>
          )}
          {filtered.map(item => {
            const id = item[idKey]?.toString();
            const checked = selected.has(id);
            const initials = (item[labelKey] || '?')[0].toUpperCase();
            return (
              <label
                key={id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  checked ? 'bg-primary-50 border border-primary-100' : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="rounded text-primary-600 flex-shrink-0"
                />
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700">{item[labelKey]}</p>
                  {subLabelKey && item[subLabelKey] && (
                    <p className="text-xs text-slate-400">{item[subLabelKey]}</p>
                  )}
                </div>
                {checked && (
                  <span className="text-xs text-primary-600 font-medium flex-shrink-0">Selected</span>
                )}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          {selected.size} of {allItems.length} selected
          {q && ` · ${filtered.length} results`}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => onSave([...selected])}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : `Save (${selected.size})`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Groups;
