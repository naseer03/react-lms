import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testService } from '../../services/test.service';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { format } from 'date-fns';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Code, User,
  ChevronDown, ChevronUp, Trophy, AlertCircle
} from 'lucide-react';

const TestResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [expandedQ, setExpandedQ] = useState({});

  const { data: test } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testService.getTest(id).then(r => r.data.data.test),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['test-attempts', id],
    queryFn: () => testService.getAllAttempts(id, { limit: 200 }).then(r => r.data.data),
  });

  const { data: attemptDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['attempt-detail', selectedAttempt?._id],
    queryFn: () => testService.getResult(selectedAttempt._id).then(r => r.data.data.attempt),
    enabled: !!selectedAttempt,
  });

  const attempts = data?.attempts || [];

  const submitted = attempts.filter(a => a.status === 'submitted');
  const passRate = submitted.length
    ? Math.round((submitted.filter(a => a.isPassed).length / submitted.length) * 100)
    : 0;

  const avgScore = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + (a.percentage || 0), 0) / submitted.length)
    : 0;

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/tests')} className="btn-secondary !py-1.5 !px-3">
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{test?.title || 'Test Results'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{attempts.length} submissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Attempts', value: attempts.length, color: 'text-slate-700' },
          { label: 'Pass Rate', value: `${passRate}%`, color: 'text-emerald-600' },
          { label: 'Avg Score', value: `${avgScore}%`, color: 'text-blue-600' },
          { label: 'Pass Mark', value: `${test?.passMark || 0}%`, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card text-center py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attempts table */}
      {attempts.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Trophy size={40} className="mx-auto mb-3 text-slate-300" />
          <p>No submissions yet</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Student</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Submitted</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Score</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Time Taken</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attempts.map(a => (
                <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-700">
                          {a.student?.name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{a.student?.name}</p>
                        <p className="text-xs text-slate-400">{a.student?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {a.submittedAt ? format(new Date(a.submittedAt), 'dd MMM yyyy, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${(a.percentage || 0) >= (test?.passMark || 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                      {a.marksObtained != null ? `${a.marksObtained}` : '—'}
                    </span>
                    <span className="text-slate-400 text-xs ml-1">({a.percentage ?? 0}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.status !== 'submitted'
                      ? <span className="badge badge-warning">In Progress</span>
                      : a.isPassed
                        ? <span className="badge badge-success">Pass</span>
                        : <span className="badge badge-danger">Fail</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">
                    {a.timeSpent ? `${Math.round(a.timeSpent / 60)} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedAttempt(a)}
                      className="btn-secondary !py-1 !px-3 text-xs"
                    >
                      View Answers
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attempt Detail Modal */}
      <Modal
        isOpen={!!selectedAttempt}
        onClose={() => { setSelectedAttempt(null); setExpandedQ({}); }}
        title={`${selectedAttempt?.student?.name} — Answers`}
        size="xl"
      >
        {loadingDetail ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : attemptDetail ? (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">
                Score: {attemptDetail.obtainedMarks}/{attemptDetail.totalMarks} ({attemptDetail.percentage}%)
              </span>
              {attemptDetail.passed
                ? <span className="badge badge-success flex items-center gap-1"><CheckCircle size={12} /> Pass</span>
                : <span className="badge badge-danger flex items-center gap-1"><XCircle size={12} /> Fail</span>}
              {attemptDetail.timeTaken && (
                <span className="text-slate-400 flex items-center gap-1 text-xs">
                  <Clock size={12} /> {Math.round(attemptDetail.timeTaken / 60)} min
                </span>
              )}
            </div>

            {/* Each answer */}
            {attemptDetail.answers?.map((ans, i) => {
              const q = ans.question;
              const isExpanded = expandedQ[i];
              const correct = ans.marksAwarded > 0;

              return (
                <div key={i} className={`border rounded-xl overflow-hidden ${correct ? 'border-emerald-200' : 'border-red-100'}`}>
                  {/* Question header */}
                  <button
                    onClick={() => setExpandedQ(p => ({ ...p, [i]: !p[i] }))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{q?.text || `Question ${i + 1}`}</p>
                      <p className="text-xs text-slate-400">
                        {q?.type} · {ans.marksAwarded}/{ans.maxMarks ?? q?.marks} marks
                        {q?.type === 'coding' && ans.codingAnswer && (
                          <span className="ml-2 text-blue-500">
                            <Code size={10} className="inline mr-0.5" />
                            {ans.codingAnswer.language} · {ans.codingAnswer.passedCount}/{ans.codingAnswer.totalCount} cases
                          </span>
                        )}
                      </p>
                    </div>
                    {correct
                      ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                      : <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                    {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </button>

                  {/* Expanded answer detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-white">
                      {/* MCQ / True-False */}
                      {(q?.type === 'mcq' || q?.type === 'true_false') && (
                        <div className="space-y-1">
                          {q.options?.map((opt, oi) => {
                            const isChosen = Array.isArray(ans.selectedOptions)
                              ? ans.selectedOptions.includes(oi)
                              : ans.selectedOptions === oi;
                            const isCorrect = opt.isCorrect;
                            return (
                              <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                isCorrect ? 'bg-emerald-50 text-emerald-700' :
                                isChosen ? 'bg-red-50 text-red-600' : 'text-slate-600'
                              }`}>
                                {isCorrect
                                  ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                                  : isChosen
                                    ? <XCircle size={13} className="text-red-400 flex-shrink-0" />
                                    : <span className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0" />}
                                {opt.text}
                                {isChosen && !isCorrect && <span className="text-xs text-red-400 ml-1">(student's answer)</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Short text */}
                      {q?.type === 'short_text' && (
                        <div className="space-y-2">
                          <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
                            <p className="text-xs text-slate-400 mb-1">Student's answer:</p>
                            <p className="text-slate-700">{ans.textAnswer || <span className="italic text-slate-400">No answer</span>}</p>
                          </div>
                          {q.expectedAnswer && (
                            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-sm">
                              <p className="text-xs text-slate-400 mb-1">Expected answer:</p>
                              <p className="text-emerald-700">{q.expectedAnswer}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coding */}
                      {q?.type === 'coding' && ans.codingAnswer && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{ans.codingAnswer.language}</span>
                            <span className={`font-semibold ${ans.codingAnswer.passedCount === ans.codingAnswer.totalCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {ans.codingAnswer.passedCount}/{ans.codingAnswer.totalCount} test cases passed
                            </span>
                          </div>
                          {/* Code block */}
                          <div className="rounded-xl overflow-hidden border border-slate-200">
                            <div className="bg-[#1e1e1e] px-3 py-2 flex items-center gap-2">
                              <Code size={13} className="text-slate-400" />
                              <span className="text-xs text-slate-400 font-mono">{ans.codingAnswer.language}</span>
                            </div>
                            <pre className="bg-[#1e1e1e] text-emerald-300 text-xs font-mono p-4 overflow-x-auto whitespace-pre-wrap max-h-72">
                              {ans.codingAnswer.code || '// No code submitted'}
                            </pre>
                          </div>
                          {/* Test case results */}
                          {ans.codingAnswer.testCaseResults?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-500 uppercase">Test Case Results</p>
                              {ans.codingAnswer.testCaseResults.map((tc, ti) => (
                                <div key={ti} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                                  tc.passed ? 'bg-emerald-50' : 'bg-red-50'
                                }`}>
                                  {tc.passed
                                    ? <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                    : <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />}
                                  <div className="text-slate-600">
                                    <span className="font-medium">{tc.passed ? 'Pass' : 'Fail'} — Case {ti + 1}</span>
                                    {!tc.passed && !tc.isHidden && (
                                      <div className="mt-0.5 space-y-0.5">
                                        {tc.input && <p>Input: <code className="bg-slate-100 px-1 rounded">{tc.input}</code></p>}
                                        <p>Expected: <code className="bg-emerald-100 px-1 rounded">{tc.expectedOutput}</code></p>
                                        <p>Got: <code className="bg-red-100 px-1 rounded">{tc.actualOutput || '(empty)'}</code></p>
                                        {tc.error && <p className="text-amber-600">{tc.error}</p>}
                                      </div>
                                    )}
                                    {tc.isHidden && !tc.passed && <span className="text-slate-400 ml-1">(hidden case)</span>}
                                  </div>
                                  <span className="ml-auto text-slate-400">{tc.executionTime}ms</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation */}
                      {q?.explanation && (
                        <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex gap-2">
                          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                          <p><span className="font-semibold">Explanation:</span> {q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default TestResults;
