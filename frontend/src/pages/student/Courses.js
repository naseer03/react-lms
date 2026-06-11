import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, Clock } from 'lucide-react';

const StudentCourses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const enrollments = user?.enrolledCourses || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Courses</h1>
        <p className="text-slate-500 text-sm mt-0.5">{enrollments.length} courses enrolled</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No courses yet</p>
          <p className="text-slate-400 text-sm mt-1">Contact your admin to get enrolled in a course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {enrollments.map((enrollment) => {
            // course may be a populated object OR a raw ObjectId string
            const course = enrollment.course;
            const courseId = course?._id || course; // handle both cases
            if (!courseId) return null;
            const courseTitle = course?.title || 'Course';
            const courseInstructor = course?.instructor || '';
            const courseThumbnail = course?.thumbnail || null;
            return (
              <div
                key={enrollment._id || courseId}
                onClick={() => navigate(`/student/courses/${courseId}`)}
                className="bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-primary-100 to-secondary-100">
                  {courseThumbnail ? (
                    <img src={`/uploads/${courseThumbnail}`} alt={courseTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={40} className="text-primary-300" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30">
                    <div className="h-full bg-primary-500 transition-all" style={{ width: `${enrollment.progress || 0}%` }} />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary-600">
                    {courseTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">{courseInstructor ? `by ${courseInstructor}` : ''}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><TrendingUp size={12} /> {enrollment.progress || 0}% complete</span>
                    {enrollment.progress === 100 ? (
                      <span className="badge-success badge text-xs">Completed</span>
                    ) : enrollment.progress > 0 ? (
                      <span className="badge-info badge text-xs">In Progress</span>
                    ) : (
                      <span className="badge-default badge text-xs">Not Started</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCourses;
