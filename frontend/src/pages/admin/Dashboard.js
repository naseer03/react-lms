import { useQuery } from '@tanstack/react-query';
import { studentService } from '../../services/student.service';
import { courseService } from '../../services/course.service';
import { testService } from '../../services/test.service';
import StatCard from '../../components/ui/StatCard';
import { Users, UserCheck, BookOpen, ClipboardList, Award, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { data: studentStats, isLoading: ls } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => studentService.getStats().then(r => r.data.data),
  });
  const { data: courseStats, isLoading: lc } = useQuery({
    queryKey: ['course-stats'],
    queryFn: () => courseService.getStats().then(r => r.data.data),
  });
  const { data: testStats, isLoading: lt } = useQuery({
    queryKey: ['test-stats'],
    queryFn: () => testService.getStats().then(r => r.data.data),
  });

  const stats = [
    { title: 'Total Students', value: studentStats?.total, icon: Users, color: 'primary', loading: ls },
    { title: 'Active Students', value: studentStats?.active, icon: UserCheck, color: 'success', loading: ls },
    { title: 'Published Courses', value: courseStats?.published, icon: BookOpen, color: 'info', loading: lc },
    { title: 'Published Tests', value: testStats?.published, icon: ClipboardList, color: 'warning', loading: lt },
    { title: 'Total Attempts', value: testStats?.totalAttempts, icon: Award, color: 'purple', loading: lt },
    { title: 'Pass Rate', value: testStats?.passRate !== undefined ? `${testStats.passRate}%` : '—', icon: TrendingUp, color: 'success', loading: lt },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Recent Enrollments</h2>
        {ls ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-3 w-48" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : studentStats?.recentEnrollments?.length === 0 ? (
          <p className="text-slate-400 text-sm py-6 text-center">No students yet</p>
        ) : (
          <div className="space-y-2">
            {studentStats?.recentEnrollments?.map(student => (
              <div key={student._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-700">{student.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                  <p className="text-xs text-slate-500 truncate">{student.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={student.status === 'active' ? 'badge-success' : 'badge-danger'}>{student.status}</span>
                  <span className="text-xs text-slate-400 hidden sm:block">{format(new Date(student.createdAt), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
