import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, Award, TrendingUp } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const enrolledCount = user?.enrolledCourses?.length || 0;

  const stats = [
    { title: 'Enrolled Courses', value: enrolledCount, icon: BookOpen, color: 'primary' },
    { title: 'Tests Pending', value: 0, icon: ClipboardList, color: 'warning' },
    { title: 'Certificates', value: 0, icon: Award, color: 'purple' },
    { title: 'Avg Progress', value: '0%', icon: TrendingUp, color: 'success' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track your learning progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-800 mb-4">My Courses</h2>
        {enrolledCount === 0 ? (
          <div className="py-12 text-center">
            <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">You are not enrolled in any courses yet.</p>
            <p className="text-slate-400 text-xs mt-1">Contact your admin to get enrolled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user.enrolledCourses.map((enrollment) => {
              const course = enrollment.course;
              const courseId = course?._id || course;
              const courseTitle = course?.title || 'Course';
              return (
                <div
                  key={enrollment._id || courseId}
                  onClick={() => courseId && navigate(`/student/courses/${courseId}`)}
                  className="border border-slate-100 rounded-xl p-4 hover:shadow-card-hover transition-shadow cursor-pointer"
                >
                  <div className="w-full h-32 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg mb-3 flex items-center justify-center">
                    <BookOpen size={32} className="text-primary-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{courseTitle}</h3>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span>{enrollment.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${enrollment.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
