import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { testService } from '../../services/test.service';
import QuestionRenderer from '../../components/test/QuestionRenderer';
import CodingEditor from '../../components/coding/CodingEditor';
import TestTimer from '../../components/test/TestTimer';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, CheckCircle, Circle, Send,
  AlertTriangle, BookOpen, Code
} from 'lucide-react';

const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});         // { questionId: answerPayload }
  const [phase, setPhase] = useState('loading');       // loading | instructions | taking | submitted
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const autoSaveRef = useRef(null);

  // Start attempt
  const startMutation = useMutation({
    mutationFn: () => testService.startAttempt(testId),
    onSuccess: async (res) => {
      const { attempt: att, test: t, resumed } = res.data.data;
      setAttempt(att);
      setTest(t);

      // Fetch questions in order
      const qRes = await testService.getTest(t._id, true);
      const qs = qRes.data.data.test.questions || [];
      // Apply questionOrder if shuffled
      if (att.questionOrder?.length) {
        const ordered = att.questionOrder.map(qId => qs.find(q => q._id === qId)).filter(Boolean);
        setQuestions(ordered.length ? ordered : qs);
      } else {
        setQuestions(qs);
      }

      // Restore draft answers if resuming
      if (resumed && att.draftAnswers) {
        setAnswers(att.draftAnswers);
        toast.success('Resumed from where you left off');
      }

      setPhase('taking');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to start test');
      navigate('/student/tests');
    },
  });

  // Auto-save
  useEffect(() => {
    if (phase !== 'taking' || !attempt) return;
    autoSaveRef.current = setInterval(async () => {
      try {
        await testService.saveDraft(attempt._id, answers);
      } catch {}
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(autoSaveRef.current);
  }, [phase, attempt, answers]);

  const handleAnswer = useCallback((questionId, answerPayload) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...answerPayload } }));
  }, []);

  const handleCodingSubmit = useCallback((questionId, result) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        codingAnswer: {
          language: result.language,
          code: result.code,
          testCaseResults: result.results,
          passedCount: result.passedCount,
          totalCount: result.totalCount,
        },
      },
    }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    clearInterval(autoSaveRef.current);
    try {
      const res = await testService.submitAttempt(attempt._id, answers);
      const { attempt: submitted } = res.data.data;
      toast.success('Test submitted successfully!');
      navigate(`/student/tests/result/${submitted._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const handleTimeUp = () => {
    toast.error('Time is up! Submitting automatically...');
    handleSubmit();
  };

  // ── Instructions screen ──────────────────────────────
  if (phase === 'loading' && !startMutation.isPending) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Load test info first */}
        <TestInstructions testId={testId} onStart={() => startMutation.mutate()} />
      </div>
    );
  }

  if (startMutation.isPending || phase === 'loading') {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  if (phase !== 'taking' || !questions.length) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentQ?._id] || {};
  const answeredCount = Object.keys(answers).filter(qId => {
    const a = answers[qId];
    return (a.selectedOptions?.length > 0) || a.textAnswer || a.fileAnswer || a.codingAnswer;
  }).length;
  const isCoding = currentQ?.type === 'coding';

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 animate-fade-in">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">{test?.title}</p>
          <p className="text-xs text-slate-500">Q{currentIdx + 1} of {questions.length} • {answeredCount} answered</p>
        </div>
        <div className="flex items-center gap-3">
          <TestTimer durationMinutes={test?.duration || 0} onTimeUp={handleTimeUp} />
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="btn-primary !py-2 text-xs"
          >
            {submitting ? <Spinner size="sm" /> : <><Send size={13} /> Submit</>}
          </button>
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden ${isCoding ? 'flex-col lg:flex-row' : ''}`}>
        {/* Question panel */}
        <div className={`flex flex-col overflow-hidden ${isCoding ? 'lg:w-[42%] border-r border-slate-100' : 'flex-1'}`}>
          {/* Question content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Question header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                {currentIdx + 1}
              </span>
              <span className="badge badge-default text-xs">{currentQ?.marks} {currentQ?.marks === 1 ? 'mark' : 'marks'}</span>
              <span className={`badge text-xs ${
                currentQ?.difficulty === 'easy' ? 'badge-success' :
                currentQ?.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'
              }`}>{currentQ?.difficulty}</span>
            </div>

            {/* Question text */}
            <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
              {currentQ?.type === 'coding' ? currentQ?.problemStatement || currentQ?.text : currentQ?.text}
            </p>

            {/* Coding: show input/output/constraints */}
            {isCoding && (
              <div className="mt-4 space-y-3 text-sm">
                {currentQ.inputFormat && (
                  <div><p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-1">Input Format</p>
                    <p className="text-slate-600">{currentQ.inputFormat}</p></div>
                )}
                {currentQ.outputFormat && (
                  <div><p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-1">Output Format</p>
                    <p className="text-slate-600">{currentQ.outputFormat}</p></div>
                )}
                {currentQ.constraints && (
                  <div><p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-1">Constraints</p>
                    <p className="text-slate-600 font-mono text-xs">{currentQ.constraints}</p></div>
                )}
                {currentQ.sampleInput && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-1">Sample Input</p>
                      <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono">{currentQ.sampleInput}</pre>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-1">Sample Output</p>
                      <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono">{currentQ.sampleOutput}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Non-coding answer area */}
            {!isCoding && (
              <QuestionRenderer
                question={currentQ}
                answer={currentAnswer}
                onChange={(payload) => handleAnswer(currentQ._id, payload)}
              />
            )}
          </div>

          {/* Navigation */}
          {!isCoding && (
            <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-white flex-shrink-0">
              <button onClick={() => setCurrentIdx(i => i - 1)} disabled={currentIdx === 0} className="btn-secondary !py-2">
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex items-center gap-1 flex-wrap justify-center max-w-xs">
                {questions.map((q, i) => {
                  const a = answers[q._id];
                  const isAnswered = (a?.selectedOptions?.length > 0) || a?.textAnswer || a?.fileAnswer || a?.codingAnswer;
                  return (
                    <button
                      key={q._id}
                      onClick={() => setCurrentIdx(i)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        i === currentIdx ? 'bg-primary-600 text-white' :
                        isAnswered ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setCurrentIdx(i => i + 1)} disabled={currentIdx === questions.length - 1} className="btn-secondary !py-2">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Coding editor panel */}
        {isCoding && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 p-4 min-h-0">
              <CodingEditor
                question={currentQ}
                attemptId={attempt._id}
                onSubmitResult={(result) => handleCodingSubmit(currentQ._id, result)}
              />
            </div>
            <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-white flex-shrink-0">
              <button onClick={() => setCurrentIdx(i => i - 1)} disabled={currentIdx === 0} className="btn-secondary !py-2">
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
                {questions.map((q, i) => {
                  const a = answers[q._id];
                  const isAnswered = a?.codingAnswer?.passedCount >= 0 || a?.selectedOptions?.length > 0 || a?.textAnswer;
                  return (
                    <button key={q._id} onClick={() => setCurrentIdx(i)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                        i === currentIdx ? 'bg-primary-600 text-white' :
                        isAnswered ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setCurrentIdx(i => i + 1)} disabled={currentIdx === questions.length - 1} className="btn-secondary !py-2">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-modal p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Submit Test?</h3>
                <p className="text-sm text-slate-500">{answeredCount}/{questions.length} questions answered</p>
              </div>
            </div>
            {answeredCount < questions.length && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                ⚠ {questions.length - answeredCount} question(s) unanswered. You cannot change answers after submission.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Review</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Spinner size="sm" /> : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Instructions screen component
const TestInstructions = ({ testId, onStart }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['test-info', testId],
    queryFn: () => testService.getTest(testId).then(r => r.data.data.test),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  const test = data;
  if (!test) return null;

  return (
    <div className="card space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{test.title}</h1>
        {test.description && <p className="text-slate-500 mt-2">{test.description}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Duration', value: test.duration > 0 ? `${test.duration} min` : 'Unlimited' },
          { label: 'Questions', value: test.questions?.length || '—' },
          { label: 'Total Marks', value: test.totalMarks },
          { label: 'Passing Marks', value: test.passingMarks },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {test.instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">Instructions</p>
          <div className="text-sm text-blue-700 whitespace-pre-wrap leading-relaxed">{test.instructions}</div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
        {test.negativeMarking && <p>⛔ Negative marking applies: −{test.negativeMarkValue} marks per wrong answer</p>}
        {test.shuffleQuestions && <p>🔀 Questions will be randomly ordered</p>}
        <p>✅ Maximum {test.maxAttempts === 0 ? 'unlimited' : test.maxAttempts} attempt(s) allowed</p>
        <p>⚠ Do not refresh the page during the test</p>
      </div>

      <button onClick={onStart} className="btn-primary w-full py-3 text-base">
        <BookOpen size={18} /> Start Test
      </button>
    </div>
  );
};

export default TakeTest;
