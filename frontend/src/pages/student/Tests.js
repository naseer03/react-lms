import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import Spinner from '../../components/ui/Spinner';
import { ClipboardList, Clock, CheckCircle, Lock, Play } from 'lucide-react';
import { format } from 'date-fns';

const StudentTests = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: () => testService.getMyAssignedTests().then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  const tests = data?.tests || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tests & Assessments</h1>
        <p className="text-slate-500 text-sm mt-0.5">{tests.length} available</p>
      </div>

      {tests.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No tests available</p>
          <p className="text-slate-400 text-sm mt-1">Tests assigned to your courses will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test._id} className="card hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => navigate(`/student/tests/${test._id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${
                  test.type === 'coding' ? 'bg-purple-100' :
                  test.type === 'exam' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <ClipboardList size={20} className={
                    test.type === 'coding' ? 'text-purple-600' :
                    test.type === 'exam' ? 'text-red-600' : 'text-blue-600'
                  } />
                </div>
                <span className="badge badge-success text-xs">{test.type}</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{test.title}</h3>
              {test.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{test.description}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {test.duration > 0 ? `${test.duration} min` : 'No time limit'}
                </span>
                <span>{test.questionCount || 0} questions</span>
                <span>{test.totalMarks} marks</span>
                {test.maxAttempts > 0 && <span>Max {test.maxAttempts} attempt{test.maxAttempts > 1 ? 's' : ''}</span>}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Pass: {test.passingMarks}/{test.totalMarks}</span>
                <button className="btn-primary !py-1.5 !px-3 text-xs">
                  <Play size={12} /> Start Test
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTests;
