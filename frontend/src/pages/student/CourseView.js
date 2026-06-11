import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { courseService } from '../../services/course.service';
import { videoService } from '../../services/video.service';
import VideoPlayer from '../../components/video/VideoPlayer';
import Spinner from '../../components/ui/Spinner';
import {
  ArrowLeft, ChevronDown, ChevronRight, Video, FileText,
  BookOpen, CheckCircle, Lock, Play
} from 'lucide-react';

const CourseView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchMe } = useAuth();
  const [activeLesson, setActiveLesson] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // Load already-completed lessons from the backend so green ticks persist
  // across sessions and page refreshes.
  useEffect(() => {
    if (!id) return;
    videoService.getCourseProgress(id)
      .then(({ data }) => {
        const ids = data?.data?.completedLessonIds || [];
        if (ids.length) setCompletedLessons(new Set(ids));
      })
      .catch(() => {}); // non-critical
  }, [id]);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-student', id],
    queryFn: () => courseService.getCourse(id, true).then(r => r.data.data.course),
    onSuccess: (c) => {
      // Auto-expand first module and select first lesson
      if (c.modules?.[0]) {
        setExpandedModules({ [c.modules[0]._id]: true });
        const firstLesson = c.modules[0].lessons?.[0];
        if (firstLesson) setActiveLesson(firstLesson);
      }
    },
  });

  const toggleModule = (id) => setExpandedModules(p => ({ ...p, [id]: !p[id] }));

  const handleLessonComplete = () => {
    if (activeLesson) {
      // 1. Immediately mark lesson done in local state → green tick in sidebar
      setCompletedLessons(p => new Set([...p, activeLesson._id]));
      // 2. Re-fetch user from backend → updates progress % in My Courses + Dashboard.
      //    This runs AFTER VideoPlayer has already POSTed saveProgress to the backend,
      //    so enrolledCourses[].progress is already recalculated in the DB.
      fetchMe().catch(() => {});
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  if (!course) return (
    <div className="card text-center py-16 text-slate-400">Course not found or you are not enrolled.</div>
  );

  const allLessons = course.modules?.flatMap(m => m.lessons || []) || [];
  const currentIndex = allLessons.findIndex(l => l._id === activeLesson?._id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="animate-fade-in flex flex-col gap-0 -m-6">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/student/courses')} className="btn-secondary !py-1.5 !px-3">
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-800 truncate">{course.title}</h2>
          {activeLesson && <p className="text-xs text-slate-500 truncate">{activeLesson.title}</p>}
        </div>
        {/* Nav between lessons */}
        <div className="flex items-center gap-2">
          <button onClick={() => prevLesson && setActiveLesson(prevLesson)}
            disabled={!prevLesson} className="btn-secondary !py-1.5 !px-3 disabled:opacity-40 text-xs">
            ← Prev
          </button>
          <button onClick={() => nextLesson && setActiveLesson(nextLesson)}
            disabled={!nextLesson} className="btn-secondary !py-1.5 !px-3 disabled:opacity-40 text-xs">
            Next →
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-130px)]">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeLesson ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Play size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Select a lesson from the sidebar to start learning</p>
              </div>
            </div>
          ) : activeLesson.type === 'video' ? (
            <div className="max-w-4xl">
              {activeLesson.video?.status === 'ready' ? (
                <VideoPlayer
                  lessonId={activeLesson._id}
                  courseId={id}
                  onComplete={handleLessonComplete}
                />
              ) : activeLesson.video?.status === 'processing' ? (
                <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Spinner size="lg" className="border-white/20 border-t-white mx-auto mb-3" />
                    <p className="text-white/70 text-sm">Video is being processed, please check back shortly</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Video size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 text-sm">No video uploaded for this lesson</p>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <h1 className="text-xl font-bold text-slate-800">{activeLesson.title}</h1>
                {activeLesson.description && (
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">{activeLesson.description}</p>
                )}
              </div>
            </div>
          ) : activeLesson.type === 'pdf' ? (
            <div className="max-w-4xl">
              <h1 className="text-xl font-bold text-slate-800 mb-4">{activeLesson.title}</h1>
              {activeLesson.pdfFile ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden h-[600px]">
                  <iframe
                    src={`/uploads/${activeLesson.pdfFile.path}`}
                    className="w-full h-full"
                    title={activeLesson.title}
                  />
                </div>
              ) : (
                <div className="card text-center py-16 text-slate-400">
                  <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                  <p>No PDF uploaded for this lesson</p>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-slate-800 mb-4">{activeLesson.title}</h1>
              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {activeLesson.content || 'No content yet.'}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — curriculum */}
        <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-100 bg-white overflow-y-auto flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Course Content</p>
            <p className="text-xs text-slate-400 mt-0.5">{allLessons.length} lessons</p>
          </div>
          <div>
            {course.modules?.map((mod, mIdx) => (
              <div key={mod._id}>
                <button
                  onClick={() => toggleModule(mod._id)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-left border-b border-slate-50"
                >
                  {expandedModules[mod._id] ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">Module {mIdx + 1}: {mod.title}</p>
                    <p className="text-xs text-slate-400">{mod.lessons?.length || 0} lessons</p>
                  </div>
                </button>
                {expandedModules[mod._id] && (
                  <div>
                    {mod.lessons?.map((lesson, lIdx) => {
                      const isActive = activeLesson?._id === lesson._id;
                      const isDone = completedLessons.has(lesson._id);
                      const Icon = { video: Video, pdf: FileText, text: BookOpen }[lesson.type] || BookOpen;
                      return (
                        <button
                          key={lesson._id}
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full flex items-start gap-3 px-5 py-2.5 text-left transition-colors border-b border-slate-50 ${
                            isActive ? 'bg-primary-50 border-l-2 border-l-primary-600' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone ? (
                              <CheckCircle size={14} className="text-emerald-500" />
                            ) : (
                              <Icon size={14} className={isActive ? 'text-primary-600' : 'text-slate-400'} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug truncate ${isActive ? 'text-primary-700 font-medium' : 'text-slate-700'}`}>
                              {mIdx + 1}.{lIdx + 1} {lesson.title}
                            </p>
                            {lesson.duration > 0 && (
                              <p className="text-xs text-slate-400 mt-0.5">{Math.round(lesson.duration / 60)} min</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseView;
