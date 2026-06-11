import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testService } from '../../services/test.service';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import { ArrowLeft, Plus, Trash2, Pencil, Send, GripVertical, ChevronDown, Code } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'mcq_single', label: 'Single Choice (Radio)' },
  { value: 'mcq_multi', label: 'Multiple Choice (Checkbox)' },
  { value: 'short_text', label: 'Short Text Answer' },
  { value: 'long_essay', label: 'Long Essay' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'coding', label: 'Coding Challenge' },
];

const QuestionForm = ({ type, register, watch, setValue, getValues }) => {
  const [options, setOptions] = useState([
    { text: 'Option A', isCorrect: false },
    { text: 'Option B', isCorrect: false },
    { text: 'Option C', isCorrect: false },
    { text: 'Option D', isCorrect: false },
  ]);
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '', isHidden: false, points: 1 }]);

  const isMCQ = type === 'mcq_single' || type === 'mcq_multi';

  // Expose options/testCases to parent via hidden inputs
  useState(() => {
    setValue('_options', options);
    setValue('_testCases', testCases);
  });

  const updateOption = (idx, field, val) => {
    const updated = options.map((o, i) => {
      if (i !== idx) return o;
      if (field === 'isCorrect' && type === 'mcq_single') return { ...o, isCorrect: val };
      return { ...o, [field]: val };
    });
    if (field === 'isCorrect' && type === 'mcq_single') {
      // Only one correct for radio
      setOptions(updated.map((o, i) => ({ ...o, isCorrect: i === idx })));
    } else {
      setOptions(updated);
    }
    setValue('_options', updated);
  };

  const addOption = () => {
    const updated = [...options, { text: `Option ${String.fromCharCode(65 + options.length)}`, isCorrect: false }];
    setOptions(updated);
    setValue('_options', updated);
  };

  const removeOption = (idx) => {
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
    setValue('_options', updated);
  };

  const addTestCase = () => {
    const updated = [...testCases, { input: '', expectedOutput: '', isHidden: false, points: 1 }];
    setTestCases(updated);
    setValue('_testCases', updated);
  };

  const updateTestCase = (idx, field, val) => {
    const updated = testCases.map((tc, i) => i === idx ? { ...tc, [field]: val } : tc);
    setTestCases(updated);
    setValue('_testCases', updated);
  };

  return (
    <div className="space-y-4">
      {/* MCQ Options */}
      {isMCQ && (
        <div>
          <label className="label">Answer Options *</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type={type === 'mcq_single' ? 'radio' : 'checkbox'}
                  name="correctOption"
                  checked={opt.isCorrect}
                  onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 flex-shrink-0"
                  title="Mark as correct"
                />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(idx, 'text', e.target.value)}
                  className="input flex-1"
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                />
                <button type="button" onClick={() => removeOption(idx)} disabled={options.length <= 2}
                  className="text-red-400 hover:text-red-600 disabled:opacity-30 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} disabled={options.length >= 6}
            className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            <Plus size={12} /> Add Option
          </button>
          <p className="text-xs text-slate-400 mt-1">Click the radio/checkbox to mark correct answer(s)</p>
        </div>
      )}

      {/* Short text expected answer */}
      {type === 'short_text' && (
        <div>
          <label className="label">Expected Answer (for auto-grading)</label>
          <input {...register('expectedAnswer')} className="input" placeholder="Leave blank for manual review" />
        </div>
      )}

      {/* Essay word limit */}
      {type === 'long_essay' && (
        <div>
          <label className="label">Word Limit</label>
          <input {...register('wordLimit')} type="number" min="0" className="input" placeholder="0 = no limit" />
        </div>
      )}

      {/* File upload allowed types */}
      {type === 'file_upload' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Allowed File Types</label>
            <input {...register('allowedFileTypes')} className="input" placeholder=".pdf,.doc,.jpg" />
            <p className="text-xs text-slate-400 mt-1">Comma-separated extensions</p>
          </div>
          <div>
            <label className="label">Max File Size (MB)</label>
            <input {...register('maxFileSize')} type="number" min="1" max="100" className="input" defaultValue={5} />
          </div>
        </div>
      )}

      {/* Coding challenge */}
      {type === 'coding' && (
        <div className="space-y-4">
          <div>
            <label className="label">Problem Statement *</label>
            <textarea {...register('problemStatement')} rows={4} className="input resize-none"
              placeholder="Describe the problem in detail..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Input Format</label>
              <textarea {...register('inputFormat')} rows={2} className="input resize-none" placeholder="Describe input..." />
            </div>
            <div>
              <label className="label">Output Format</label>
              <textarea {...register('outputFormat')} rows={2} className="input resize-none" placeholder="Describe output..." />
            </div>
          </div>
          <div>
            <label className="label">Constraints</label>
            <input {...register('constraints')} className="input" placeholder="e.g. 1 ≤ N ≤ 10^5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sample Input</label>
              <textarea {...register('sampleInput')} rows={3} className="input resize-none font-mono text-xs" />
            </div>
            <div>
              <label className="label">Sample Output</label>
              <textarea {...register('sampleOutput')} rows={3} className="input resize-none font-mono text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Time Limit (ms)</label>
              <input {...register('timeLimit')} type="number" min="500" max="10000" className="input" defaultValue={2000} />
            </div>
            <div>
              <label className="label">Memory Limit (MB)</label>
              <input {...register('memoryLimit')} type="number" min="64" max="512" className="input" defaultValue={256} />
            </div>
          </div>

          {/* Test Cases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Test Cases *</label>
              <button type="button" onClick={addTestCase} className="text-xs text-primary-600 font-medium flex items-center gap-1">
                <Plus size={12} /> Add Case
              </button>
            </div>
            <div className="space-y-3">
              {testCases.map((tc, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600">Case {idx + 1}</p>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={tc.isHidden} onChange={(e) => updateTestCase(idx, 'isHidden', e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary-600" />
                        Hidden
                      </label>
                      <button type="button" onClick={() => {
                        const updated = testCases.filter((_, i) => i !== idx);
                        setTestCases(updated);
                        setValue('_testCases', updated);
                      }} disabled={testCases.length <= 1} className="text-red-400 hover:text-red-600 disabled:opacity-30">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Input</label>
                      <textarea value={tc.input} onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        rows={2} className="input resize-none font-mono text-xs" placeholder="stdin" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Expected Output *</label>
                      <textarea value={tc.expectedOutput} onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                        rows={2} className="input resize-none font-mono text-xs" placeholder="expected stdout" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Points</label>
                    <input type="number" min="1" value={tc.points} onChange={(e) => updateTestCase(idx, 'points', parseInt(e.target.value) || 1)}
                      className="input w-20 text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main TestBuilder Page ──────────────────────────────

const TestBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addQuestionModal, setAddQuestionModal] = useState(false);
  const [editQuestionModal, setEditQuestionModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedType, setSelectedType] = useState('mcq_single');
  const [expandedQ, setExpandedQ] = useState({});

  const { data: test, isLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testService.getTest(id, true).then(r => r.data.data.test),
  });

  const invalidate = () => queryClient.invalidateQueries(['test', id]);

  const addQMutation = useMutation({
    mutationFn: (d) => testService.addQuestion(id, d),
    onSuccess: () => { toast.success('Question added'); invalidate(); setAddQuestionModal(false); resetQ(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteQMutation = useMutation({
    mutationFn: (qId) => testService.deleteQuestion(qId),
    onSuccess: () => { toast.success('Question deleted'); invalidate(); setConfirmDelete(null); },
    onError: () => toast.error('Delete failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => testService.publishTest(id),
    onSuccess: () => { toast.success('Test published!'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cannot publish'),
  });

  const { register: regQ, handleSubmit: submitQ, reset: resetQ, watch: watchQ, setValue: setValueQ, getValues: getValuesQ } = useForm({
    defaultValues: { marks: 1, difficulty: 'medium', negativeMarks: 0 }
  });

  const buildQuestionPayload = (data) => {
    const payload = {
      type: selectedType,
      text: data.text,
      marks: parseFloat(data.marks) || 1,
      difficulty: data.difficulty,
      negativeMarks: parseFloat(data.negativeMarks) || 0,
      explanation: data.explanation,
    };

    if (selectedType === 'mcq_single' || selectedType === 'mcq_multi') {
      payload.options = data._options || [];
    }
    if (selectedType === 'short_text') payload.expectedAnswer = data.expectedAnswer;
    if (selectedType === 'long_essay') payload.wordLimit = parseInt(data.wordLimit) || 0;
    if (selectedType === 'file_upload') {
      payload.allowedFileTypes = data.allowedFileTypes?.split(',').map(s => s.trim()).filter(Boolean) || [];
      payload.maxFileSize = parseInt(data.maxFileSize) || 5;
    }
    if (selectedType === 'coding') {
      payload.problemStatement = data.problemStatement;
      payload.inputFormat = data.inputFormat;
      payload.outputFormat = data.outputFormat;
      payload.constraints = data.constraints;
      payload.sampleInput = data.sampleInput;
      payload.sampleOutput = data.sampleOutput;
      payload.timeLimit = parseInt(data.timeLimit) || 2000;
      payload.memoryLimit = parseInt(data.memoryLimit) || 256;
      payload.testCases = (data._testCases || []).filter(tc => tc.expectedOutput);
    }
    return payload;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!test) return <div className="card text-center py-16 text-slate-400">Test not found</div>;

  const questions = test.questions || [];

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/tests')} className="btn-secondary !py-2 !px-3">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 truncate">{test.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge text-xs ${test.status === 'published' ? 'badge-success' : 'badge-default'}`}>{test.status}</span>
            <span className="badge badge-info text-xs">{test.type}</span>
            <span className="text-slate-400 text-xs">• {questions.length} questions • {test.totalMarks} marks</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {test.status === 'draft' && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="btn-primary">
              {publishMutation.isPending ? <Spinner size="sm" /> : <><Send size={14} /> Publish</>}
            </button>
          )}
        </div>
      </div>

      {/* Test settings summary */}
      <div className="card !py-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <span>⏱ {test.duration > 0 ? `${test.duration} min` : 'Unlimited'}</span>
          <span>✅ Pass: {test.passingMarks}/{test.totalMarks} marks</span>
          <span>🔄 Attempts: {test.maxAttempts === 0 ? 'Unlimited' : test.maxAttempts}</span>
          {test.negativeMarking && <span>⛔ Negative marking: −{test.negativeMarkValue} per wrong</span>}
          {test.shuffleQuestions && <span>🔀 Questions shuffled</span>}
        </div>
      </div>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Questions ({questions.length})</h2>
          <button onClick={() => { resetQ({ marks: 1, difficulty: 'medium' }); setSelectedType('mcq_single'); setAddQuestionModal(true); }} className="btn-primary !py-2 text-xs">
            <Plus size={14} /> Add Question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="card text-center py-16 border-dashed">
            <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No questions yet — add your first question</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q._id} className="border border-slate-100 rounded-xl bg-white shadow-card">
                <div className="flex items-start gap-3 px-4 py-3.5 cursor-pointer" onClick={() => setExpandedQ(p => ({ ...p, [q._id]: !p[q._id] }))}>
                  <GripVertical size={16} className="text-slate-300 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-500">Q{idx + 1}</span>
                      <span className="badge badge-default text-xs">{QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</span>
                      <span className="badge badge-info text-xs">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
                      {q.type === 'coding' && <Code size={12} className="text-slate-400" />}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(q); }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                      <Trash2 size={13} />
                    </button>
                    {expandedQ[q._id] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-300 rotate-[-90deg]" />}
                  </div>
                </div>
                {expandedQ[q._id] && (
                  <div className="px-6 pb-4 border-t border-slate-50 pt-3 space-y-2">
                    {q.type === 'mcq_single' || q.type === 'mcq_multi' ? (
                      <div className="space-y-1.5">
                        {q.options?.map((opt) => (
                          <div key={opt._id} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${opt.isCorrect ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600'}`}>
                            {opt.isCorrect ? '✓' : '○'} {opt.text}
                          </div>
                        ))}
                      </div>
                    ) : q.type === 'coding' ? (
                      <div className="text-sm text-slate-600 space-y-1">
                        <p className="font-medium text-slate-700">{q.problemStatement?.slice(0, 200)}...</p>
                        <p className="text-xs text-slate-400">{q.testCases?.length || 0} test cases ({q.testCases?.filter(tc => tc.isHidden)?.length || 0} hidden)</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        {q.type === 'short_text' && q.expectedAnswer ? `Expected: ${q.expectedAnswer}` : `Type: ${q.type}`}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      <Modal isOpen={addQuestionModal} onClose={() => { setAddQuestionModal(false); resetQ(); }} title="Add Question" size="xl"
        footer={
          <>
            <button onClick={() => { setAddQuestionModal(false); resetQ(); }} className="btn-secondary">Cancel</button>
            <button form="add-q-form" type="submit" className="btn-primary" disabled={addQMutation.isPending}>
              {addQMutation.isPending ? <Spinner size="sm" /> : 'Add Question'}
            </button>
          </>
        }
      >
        <form id="add-q-form" onSubmit={submitQ(d => addQMutation.mutate(buildQuestionPayload(d)))} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="label">Question Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUESTION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedType(t.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all text-left ${
                    selectedType === t.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300'
                  }`}
                >
                  {t.value === 'coding' && <Code size={11} className="inline mr-1" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question text */}
          <div>
            <label className="label">Question Text *</label>
            <textarea {...regQ('text', { required: 'Question text is required' })} rows={3} className="input resize-none"
              placeholder="Enter your question..." />
          </div>

          {/* Type-specific fields */}
          <QuestionForm type={selectedType} register={regQ} watch={watchQ} setValue={setValueQ} getValues={getValuesQ} />

          {/* Scoring */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="label">Marks *</label>
              <input {...regQ('marks', { required: true, min: 0.5 })} type="number" step="0.5" min="0.5" className="input" />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select {...regQ('difficulty')} className="input appearance-none">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Negative Marks</label>
              <input {...regQ('negativeMarks')} type="number" step="0.25" min="0" className="input" />
            </div>
          </div>

          <div>
            <label className="label">Explanation (shown after submission)</label>
            <textarea {...regQ('explanation')} rows={2} className="input resize-none"
              placeholder="Explain why the correct answer is correct..." />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteQMutation.mutate(confirmDelete._id)}
        loading={deleteQMutation.isPending}
        title="Delete Question"
        message={`Delete this question? "${confirmDelete?.text?.slice(0, 60)}..."`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

// Fix missing import
const ClipboardList = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </svg>
);

export default TestBuilder;
