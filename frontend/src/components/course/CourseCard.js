import { BookOpen, Clock, BarChart3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LEVEL_COLORS = {
  beginner: 'badge-success',
  intermediate: 'badge-info',
  advanced: 'badge-warning',
};

const CourseCard = ({ course, isAdmin = false, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) return onClick(course);
    if (isAdmin) navigate(`/admin/courses/${course._id}`);
    else navigate(`/student/courses/${course._id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary-100 to-secondary-100 overflow-hidden">
        {course.thumbnail ? (
          <img
            src={`/uploads/${course.thumbnail}`}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={40} className="text-primary-300" />
          </div>
        )}
        {/* Status badge */}
        {isAdmin && (
          <div className="absolute top-2 right-2">
            <span className={`badge text-xs ${course.status === 'published' ? 'badge-success' : course.status === 'draft' ? 'badge-default' : 'badge-warning'}`}>
              {course.status}
            </span>
          </div>
        )}
        {/* Level badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`badge text-xs ${LEVEL_COLORS[course.level] || 'badge-default'}`}>{course.level}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description}</p>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <BarChart3 size={12} />
            {course.instructor}
          </span>
          {course.enrolledCount > 0 && (
            <span className="flex items-center gap-1 ml-auto">
              <Users size={12} /> {course.enrolledCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
