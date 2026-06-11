import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService } from '../../services/course.service';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import VideoUploader from '../../components/video/VideoUploader';
import Spinner from '../../components/ui/Spinner';
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Video, FileText, BookOpen, Eye, EyeOff, Upload, GripVertical
} from 'lucide-react';

const LESSON_TYPE_ICONS = { video: Video, pdf: FileText, text: BookOpen };

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const thumbInputRef = useRef(null);

  const [expandedModules, setExpandedModules] = useState({});
  const [addModuleModal, setAddModuleModal] = useState(false);
  const [editModuleModal, setEditModuleModal] = useState(null);
  const [addLessonModal, setAddLessonModal] = useState(null); // moduleId
  const [editLessonModal, setEditLessonModal] = useState(null);
  const [uploadVideoModal, setUploadVideoModal] = useState(null); // lessonId
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editCourseModal, setEditCourseModal] = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => courseService.getCourse(id, true).then(r => r.data.data.course),
  });

  const invalidate = () => queryClient.invalidateQueries(['course', id]);

  // Course update
  const updateCourseMutation = useMutation({
    mutationFn: (d) => courseService.updateCourse(id, d),
    onSuccess: () => { toast.success('Course updated'); invalidate(); setEditCourseModal(false); },
    onError: () => toast.error('Update failed'),
  });

  // Module mutations
  const addModuleMutation = useMutation({
    mutationFn: (d) => courseService.createModule(id, d),
    onSuccess: (res) => {
      toast.success('Module added');
      invalidate();
      setAddModuleModal(false);
      setExpandedModules(prev => ({ ...prev, [res.data.data.module._id]: true }));
    },
    onError: () => toast.error('Failed to add module'),
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ modId, data }) => courseService.updateModule(modId, data),
    onSuccess: () => { toast.success('Module updated'); invalidate(); setEditModuleModal(null); },
    onError: () => toast.error('Update failed'),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (modId) => courseService.deleteModule(modId),
    onSuccess: () => { toast.success('Module deleted'); invalidate(); setConfirmDelete(null); },
    onError: () => toast.error('Delete failed'),
  });

  // Lesson mutations
  const addLessonMutation = useMutation({
    mutationFn: ({ moduleId, data }) => courseService.createLesson(id, moduleId, data),
    onSuccess: () => { toast.success('Lesson added'); invalidate(); setAddLessonModal(null); },
    onError: () => toast.error('Failed to add lesson'),
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }) => courseService.updateLesson(lessonId, data),
    onSuccess: () => { toast.success('Lesson updated'); invalidate(); setEditLessonModal(null); },
    onError: () => toast.error('Update failed'),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => courseService.deleteLesson(lessonId),
    onSuccess: () => { toast.success('Lesson deleted'); invalidate(); setConfirmDelete(null); },
    onError: () => toast.error('Delete failed'),
  });

  // Thumbnail upload
  const handleThumbUpload = async (file) => {
    if (!file) return;
    setThumbUploading(true);
    try {
      await courseService.uploadThumbnail(id, file);
      toast.success('Thumbnail updated');
      invalidate();
    } catch { toast.error('Upload failed'); }
    finally { setThumbUploading(false); }
  };

  // Forms
  const { register: regModule, handleSubmit: submitModule, reset: resetModule } = useForm();
  const { register: regLesson, handleSubmit: submitLesson, reset: resetLesson, watch: watchLesson } = useForm({ defaultValues: { type: 'video' } });
  const { register: regCourse, handleSubmit: submitCourse, reset: resetCourse } = useForm();

  const toggleModule = (modId) => setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  const course = data;
  if (!course) return <div className="card text-center py-16 text-slate-400">Course not found</div>;

  const totalLessons = course.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/courses')} className="btn-secondary !py-2 !px-3">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 truncate">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge text-xs ${course.status === 'published' ? 'badge-success' : 'badge-default'}`}>{course.status}</span>
            <span className="badge badge-info text-xs">{course.level}</span>
            <span className="text-slate-400 text-xs">• {totalLessons} lessons • {course.modules?.length || 0} modules</span>
          </div>
        </div>
        <button onClick={() => { resetCourse(course); setEditCourseModal(true); }} className="btn-secondary">
          <Pencil size={14} /> Edit
        </button>
      </div>

      {/* Course info card */}
      <div className="card flex gap-6 items-start">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-40 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-primary-100 to-secondary-100 group">
          {course.thumbnail ? (
            <img src={`/uploads/${course.thumbnail}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={32} className="text-primary-300" />
            </div>
          )}
          <button
            onClick={() => thumbInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {thumbUploading ? <Spinner size="sm" className="border-white/20 border-t-white" /> : <Upload size={20} className="text-white" />}
          </button>
          <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleThumbUpload(e.target.files[0])} />
        </div>
        <div className="flex-1 space-y-1 text-sm">
          <p className="text-slate-600">{course.description}</p>
          <p className="text-slate-500">Instructor: <span className="text-slate-800 font-medium">{course.instructor}</span></p>
          {course.category && <p className="text-slate-500">Category: <span className="text-slate-800 font-medium">{course.category}</span></p>}
          <p className="text-slate-500">Enrolled: <span className="text-slate-800 font-medium">{course.enrolledCount} students</span></p>
        </div>
      </div>

      {/* Modules section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Course Content</h2>
          <button onClick={() => { resetModule(); setAddModuleModal(true); }} className="btn-primary !py-2 text-xs">
            <Plus size={14} /> Add Module
          </button>
        </div>

        {!course.modules?.length ? (
          <div className="card text-center py-12 border-dashed">
            <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No modules yet — add your first module to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {course.modules.map((mod, modIdx) => (
              <div key={mod._id} className="border border-slate-100 rounded-xl bg-white shadow-card overflow-hidden">
                {/* Module header */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleModule(mod._id)}
                >
                  <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
                  {expandedModules[mod._id] ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      Module {modIdx + 1}: {mod.title}
                    </p>
                    {mod.description && <p className="text-xs text-slate-500 truncate">{mod.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">{mod.lessons?.length || 0} lessons</span>
                    <button onClick={(e) => { e.stopPropagation(); setEditModuleModal(mod); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                      <Pencil size={13} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'module', id: mod._id, name: mod.title }); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Lessons */}
                {expandedModules[mod._id] && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {mod.lessons?.map((lesson, lsnIdx) => {
                      const Icon = LESSON_TYPE_ICONS[lesson.type] || BookOpen;
                      return (
                        <div key={lesson._id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50/50">
                          <GripVertical size={14} className="text-slate-200" />
                          <Icon size={15} className="text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 truncate">
                              {modIdx + 1}.{lsnIdx + 1} {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="badge badge-default text-xs">{lesson.type}</span>
                              {lesson.duration > 0 && (
                                <span className="text-xs text-slate-400">{Math.round(lesson.duration / 60)} min</span>
                              )}
                              {lesson.video?.status === 'processing' && (
                                <span className="badge badge-warning text-xs">Processing...</span>
                              )}
                              {lesson.video?.status === 'ready' && (
                                <span className="badge badge-success text-xs">Ready</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {lesson.type === 'video' && !lesson.video && (
                              <button
                                onClick={() => setUploadVideoModal({ lessonId: lesson._id, courseId: id })}
                                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded-lg"
                              >
                                <Upload size={12} /> Upload Video
                              </button>
                            )}
                            {lesson.type === 'video' && lesson.video?.status === 'failed' && (
                              <button
                                onClick={() => setUploadVideoModal({ lessonId: lesson._id, courseId: id })}
                                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded-lg"
                              >
                                Re-upload
                              </button>
                            )}
                            <button onClick={() => setEditLessonModal(lesson)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setConfirmDelete({ type: 'lesson', id: lesson._id, name: lesson.title })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="px-6 py-3">
                      <button
                        onClick={() => { resetLesson({ type: 'video' }); setAddLessonModal(mod._id); }}
                        className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <Plus size={13} /> Add Lesson
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      <Modal isOpen={editCourseModal} onClose={() => setEditCourseModal(false)} title="Edit Course" size="md"
        footer={
          <>
            <button onClick={() => setEditCourseModal(false)} className="btn-secondary">Cancel</button>
            <button form="edit-course-form" type="submit" className="btn-primary" disabled={updateCourseMutation.isPending}>
              {updateCourseMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-course-form" onSubmit={submitCourse(d => updateCourseMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input {...regCourse('title')} defaultValue={course.title} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...regCourse('description')} defaultValue={course.description} rows={3} className="input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Instructor</label>
              <input {...regCourse('instructor')} defaultValue={course.instructor} className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <input {...regCourse('category')} defaultValue={course.category} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Level</label>
              <select {...regCourse('level')} defaultValue={course.level} className="input appearance-none">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select {...regCourse('status')} defaultValue={course.status} className="input appearance-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Module Modal */}
      <Modal isOpen={addModuleModal} onClose={() => { setAddModuleModal(false); resetModule(); }} title="Add Module" size="sm"
        footer={
          <>
            <button onClick={() => { setAddModuleModal(false); resetModule(); }} className="btn-secondary">Cancel</button>
            <button form="add-module-form" type="submit" className="btn-primary" disabled={addModuleMutation.isPending}>
              {addModuleMutation.isPending ? <Spinner size="sm" /> : 'Add Module'}
            </button>
          </>
        }
      >
        <form id="add-module-form" onSubmit={submitModule(d => addModuleMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Module Title *</label>
            <input {...regModule('title', { required: true })} className="input" placeholder="e.g. Introduction" autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...regModule('description')} rows={2} className="input resize-none" placeholder="Optional module description" />
          </div>
        </form>
      </Modal>

      {/* Edit Module Modal */}
      <Modal isOpen={!!editModuleModal} onClose={() => setEditModuleModal(null)} title="Edit Module" size="sm"
        footer={
          <>
            <button onClick={() => setEditModuleModal(null)} className="btn-secondary">Cancel</button>
            <button form="edit-module-form" type="submit" className="btn-primary" disabled={updateModuleMutation.isPending}>
              {updateModuleMutation.isPending ? <Spinner size="sm" /> : 'Save'}
            </button>
          </>
        }
      >
        <form id="edit-module-form" onSubmit={submitModule(d => updateModuleMutation.mutate({ modId: editModuleModal?._id, data: d }))} className="space-y-4">
          <div>
            <label className="label">Module Title</label>
            <input {...regModule('title')} defaultValue={editModuleModal?.title} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...regModule('description')} defaultValue={editModuleModal?.description} rows={2} className="input resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="modPublished" {...regModule('isPublished')} defaultChecked={editModuleModal?.isPublished} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="modPublished" className="text-sm text-slate-700">Published</label>
          </div>
        </form>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal isOpen={!!addLessonModal} onClose={() => { setAddLessonModal(null); resetLesson({ type: 'video' }); }} title="Add Lesson" size="sm"
        footer={
          <>
            <button onClick={() => { setAddLessonModal(null); resetLesson({ type: 'video' }); }} className="btn-secondary">Cancel</button>
            <button form="add-lesson-form" type="submit" className="btn-primary" disabled={addLessonMutation.isPending}>
              {addLessonMutation.isPending ? <Spinner size="sm" /> : 'Add Lesson'}
            </button>
          </>
        }
      >
        <form id="add-lesson-form" onSubmit={submitLesson(d => addLessonMutation.mutate({ moduleId: addLessonModal, data: d }))} className="space-y-4">
          <div>
            <label className="label">Lesson Title *</label>
            <input {...regLesson('title', { required: true })} className="input" placeholder="e.g. Getting Started" autoFocus />
          </div>
          <div>
            <label className="label">Type</label>
            <select {...regLesson('type')} className="input appearance-none">
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="text">Text</option>
            </select>
          </div>
          {watchLesson('type') === 'text' && (
            <div>
              <label className="label">Content</label>
              <textarea {...regLesson('content')} rows={4} className="input resize-none" placeholder="Lesson text content..." />
            </div>
          )}
          <div>
            <label className="label">Description</label>
            <textarea {...regLesson('description')} rows={2} className="input resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="preview" {...regLesson('isFreePreview')} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="preview" className="text-sm text-slate-700">Free Preview</label>
          </div>
        </form>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal isOpen={!!editLessonModal} onClose={() => setEditLessonModal(null)} title="Edit Lesson" size="sm"
        footer={
          <>
            <button onClick={() => setEditLessonModal(null)} className="btn-secondary">Cancel</button>
            <button form="edit-lesson-form" type="submit" className="btn-primary" disabled={updateLessonMutation.isPending}>
              {updateLessonMutation.isPending ? <Spinner size="sm" /> : 'Save'}
            </button>
          </>
        }
      >
        <form id="edit-lesson-form" onSubmit={submitLesson(d => updateLessonMutation.mutate({ lessonId: editLessonModal?._id, data: d }))} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input {...regLesson('title')} defaultValue={editLessonModal?.title} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...regLesson('description')} defaultValue={editLessonModal?.description} rows={2} className="input resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="lsnPublished" {...regLesson('isPublished')} defaultChecked={editLessonModal?.isPublished} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="lsnPublished" className="text-sm text-slate-700">Published</label>
          </div>
        </form>
      </Modal>

      {/* Upload Video Modal */}
      <Modal isOpen={!!uploadVideoModal} onClose={() => setUploadVideoModal(null)} title="Upload Video" size="md">
        {uploadVideoModal && (
          <VideoUploader
            lessonId={uploadVideoModal.lessonId}
            courseId={uploadVideoModal.courseId}
            onUploadComplete={() => { invalidate(); setTimeout(() => setUploadVideoModal(null), 2000); }}
          />
        )}
      </Modal>

      {/* Confirm Deletes */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'module') deleteModuleMutation.mutate(confirmDelete.id);
          else deleteLessonMutation.mutate(confirmDelete.id);
        }}
        loading={deleteModuleMutation.isPending || deleteLessonMutation.isPending}
        title={`Delete ${confirmDelete?.type === 'module' ? 'Module' : 'Lesson'}`}
        message={`Permanently delete "${confirmDelete?.name}"? ${confirmDelete?.type === 'module' ? 'All lessons in this module will also be deleted.' : ''}`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default CourseDetail;
