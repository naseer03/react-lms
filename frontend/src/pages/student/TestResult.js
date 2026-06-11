import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testService } from '../../services/test.service';
import QuestionRenderer from '../../components/test/QuestionRenderer';
import Spinner from '../../components/ui/Spinner';
import { format } from 'date-fns';
import {
  CheckCircle, XCircle, Clock, Award, ChevronDown, ChevronRight,
  ArrowLeft, BarChart3
} from 'lucide-react';
import { useState } from 'react';

const TestResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [expandedQ, setExpandedQ] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['test-result', attemptId],
    queryFn: () => testService.getResult(attemptId).then(r => r.data.data.attempt),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  const attempt = data;
  if (!attempt) return <div className="card text-center py-16 text-slate-400">Result not found</div>;

  const { test, marksObtained, totalMarks, percentage, isPassed, timeSpent, answers } = attempt;
  const minutes = Math.floor((timeSpent || 0) / 60);
  const seconds = (timeSpent || 0) % 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/student/tests')} className="btn-secondary !py-2 !px-3">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Test Result</h1>
      </div>

      {/* Result card */}
      <div className={`card text-center py-8 border-2 ${isPassed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isPassed ? 'bg-emerald-100' : 'bg-red-100'}`}>
          {isPassed
            ? <CheckCircle size={40} className="text-emerald-600" />
            : <XCircle size={40} className="text-red-500" />
          }
        </div>
        <h2 className={`text-3xl font-extrabold mb-1 ${isPassed ? 'text-emerald-700' : 'text-red-600'}`}>
          {isPassed ? 'Passed! 🎉' : 'Failed'}
        </h2>
        <p className="text-slate-600 font-medium">{test?.title}</p>

        <div className="mt-6 flex items-center justify-center gap-1">
          <div className="w-48 h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isPassed ? 'bg-emerald-500' : 'bg-red-400'}`}
              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
          </div>
          <span className={`ml-2 text-lg font-bold ${isPassed ? 'text-emerald-700' : 'text-red-600'}`}>{percentage}%</span>
        </div>

        <div className="mt-6 flex items-center justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{marksObtained}</p>
            <p className="text-slate-500 text-xs">Marks Obtained</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{totalMarks}</p>
            <p className="text-slate-500 text-xs">Total Marks</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{minutes}:{String(seconds).padStart(2, '0')}</p>
            <p className="text-slate-500 text-xs">Time Spent</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Submitted {attempt.submittedAt ? format(new Date(attempt.submittedAt), 'MMM d, yyyy HH:mm') : '—'}
        </p>
      </div>

      {/* Answer review */}
      {test?.showResultImmediately !== false && answers?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Answer Review</h2>
          {answers.map((ans, idx) => {
            const q = ans.question;
            if (!q) return null;
            const isCorrect = ans.isCorrect;
            const isGraded = ans.isGraded;
            const marks = ans.marksAwarded;

            return (
              <div key={ans._id} className={`border-2 rounded-xl overflow-hidden ${
                !isGraded ? 'border-slate-200' :
                isCorrect ? 'border-emerald-200' :
                marks < 0 ? 'border-red-200' : 'border-amber-200'
              }`}>
                <button
                  onClick={() => setExpandedQ(p => ({ ...p, [ans._id]: !p[ans._id] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="text-xs font-bold text-slate-500 w-6 flex-shrink-0">Q{idx + 1}</span>
                  <p className="flex-1 text-sm text-slate-700 line-clamp-1">{q.text}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isGraded ? (
                      <span className="badge badge-warning text-xs">Pending Review</span>
                    ) : isCorrect ? (
                      <span className="badge badge-success text-xs">+{marks}</span>
                    ) : marks < 0 ? (
                      <span className="badge badge-danger text-xs">{marks}</span>
                    ) : (
                      <span className="badge badge-default text-xs">0</span>
                    )}
                    {expandedQ[ans._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>
                {expandedQ[ans._id] && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <QuestionRenderer
                      question={q}
                      answer={ans}
                      readOnly
                    />
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
                        <p className="text-sm text-blue-700">{q.explanation}</p>
                      </div>
                    )}
                    {ans.type === 'coding' && ans.codingAnswer && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Coding Result: {ans.codingAnswer.passedCount}/{ans.codingAnswer.totalCount} test cases passed
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestResult;
