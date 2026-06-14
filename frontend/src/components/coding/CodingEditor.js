import { useState, useEffect, useRef, useCallback } from 'react';
import { codingService } from '../../services/coding.service';
import Spinner from '../ui/Spinner';
import {
  Play, Send, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, AlertCircle, Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamically load Monaco Editor from CDN
let monacoLoaded = false;
const loadMonaco = () =>
  new Promise((resolve) => {
    if (monacoLoaded && window.monaco) return resolve(window.monaco);
    if (window.require) { monacoLoaded = true; return resolve(window.monaco); }

    // Load AMD loader
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
    script.onload = () => {
      window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
      window.require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        resolve(window.monaco);
      });
    };
    document.head.appendChild(script);
  });

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'c', label: 'C', monacoLang: 'c' },
];

const STATUS_ICONS = {
  passed: <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />,
  failed: <XCircle size={14} className="text-red-500 flex-shrink-0" />,
  error: <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />,
};

const CodingEditor = ({ question, attemptId, onSubmitResult, readOnly = false }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeTab, setActiveTab] = useState('testcases'); // testcases | output | custom

  // Initialize starter code when language changes
  useEffect(() => {
    const starter = question?.starterCode?.[language] || '';
    setCode(starter);
    if (editorRef.current) editorRef.current.setValue(starter);
  }, [language, question]);

  // Initialize Monaco
  useEffect(() => {
    let editor;
    loadMonaco().then((monaco) => {
      monacoRef.current = monaco;
      if (!containerRef.current) return;

      editor = monaco.editor.create(containerRef.current, {
        value: question?.starterCode?.[language] || '',
        language: LANGUAGES.find(l => l.value === language)?.monacoLang || 'python',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        readOnly,
        padding: { top: 12, bottom: 12 },
        lineNumbers: 'on',
        renderLineHighlight: 'gutter',
        suggest: { preview: true },
        contextmenu: false,
      });

      editorRef.current = editor;
      editor.onDidChangeModelContent(() => {
        setCode(editor.getValue());
      });
    });

    return () => { if (editor) editor.dispose(); };
  }, []); // eslint-disable-line

  // Update Monaco language when changed
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) return;
    const monacoLang = LANGUAGES.find(l => l.value === language)?.monacoLang || 'python';
    monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), monacoLang);
  }, [language]);

  const handleRun = useCallback(async () => {
    if (!code.trim()) return toast.error('Write some code first');
    setRunning(true);

    const hasVisibleCases = visibleTestCases.length > 0;
    // Always switch to output so the student sees something; testcases tab also updates if cases exist
    setActiveTab(hasVisibleCases ? 'testcases' : 'output');

    try {
      // Always run code for stdout display (using whatever is in customInput box, or empty)
      const customPromise = codingService.runCustom({ language, code, input: customInput });

      if (hasVisibleCases) {
        // Run against visible test cases in parallel
        const [{ data }, { data: customData }] = await Promise.all([
          codingService.run({ questionId: question._id, language, code }),
          customPromise,
        ]);
        setRunResult({ ...data.data, customOutput: customData.data });
      } else {
        // No test cases — just show output
        const { data: customData } = await customPromise;
        setRunResult({ customOutput: customData.data, results: [], passedCount: 0, totalCount: 0 });
        setActiveTab('output');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  }, [code, language, question, customInput, visibleTestCases]);

  const handleRunCustom = useCallback(async () => {
    if (!code.trim()) return toast.error('Write some code first');
    setRunning(true);
    setActiveTab('output');
    try {
      const { data } = await codingService.runCustom({ language, code, input: customInput });
      setRunResult({ customOutput: data.data });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  }, [code, language, customInput]);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) return toast.error('Write some code first');
    setSubmitting(true);
    try {
      const { data } = await codingService.submit({ questionId: question._id, attemptId, language, code });
      setRunResult(data.data);
      onSubmitResult?.(data.data);
      toast.success(`Submitted! ${data.data.passedCount}/${data.data.totalCount} test cases passed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [code, language, question, attemptId, onSubmitResult]);

  const resetCode = () => {
    const starter = question?.starterCode?.[language] || '';
    setCode(starter);
    if (editorRef.current) editorRef.current.setValue(starter);
  };

  const visibleTestCases = question?.testCases?.filter(tc => !tc.isHidden) || [];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d2d2d] border-b border-[#3e3e3e]">
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={readOnly}
              className="appearance-none bg-[#3e3e3e] text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#555] focus:outline-none focus:border-primary-500 cursor-pointer pr-7"
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={resetCode} title="Reset to starter code" disabled={readOnly}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#3e3e3e] rounded-lg disabled:opacity-40">
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={handleRun}
                disabled={running || submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {running ? <Spinner size="sm" className="border-white/20 border-t-white" /> : <Play size={13} fill="currentColor" />}
                Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={running || submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {submitting ? <Spinner size="sm" className="border-white/20 border-t-white" /> : <Send size={13} />}
                Submit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monaco editor area */}
      <div ref={containerRef} className="flex-1 min-h-0" style={{ minHeight: '280px' }} />

      {/* Bottom panel */}
      <div className="border-t border-[#3e3e3e] bg-[#1e1e1e]" style={{ height: '220px' }}>
        {/* Tabs */}
        <div className="flex items-center gap-0 bg-[#2d2d2d] border-b border-[#3e3e3e]">
          {[
            { id: 'testcases', label: 'Test Cases' },
            { id: 'output', label: 'Output' },
            { id: 'custom', label: 'Custom Input' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.id === 'testcases' && runResult?.results && (
                <span className={`ml-1.5 badge text-xs ${
                  runResult.passedCount === runResult.totalCount ? 'badge-success' : 'badge-danger'
                }`}>
                  {runResult.passedCount}/{runResult.totalCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="h-[calc(100%-36px)] overflow-y-auto p-3">
          {/* Test Cases tab */}
          {activeTab === 'testcases' && (
            <div className="space-y-2">
              {runResult?.results ? (
                runResult.results.map((r, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                    r.passed ? 'bg-emerald-950/50 border border-emerald-800' : 'bg-red-950/50 border border-red-800'
                  }`}>
                    {r.passed ? STATUS_ICONS.passed : STATUS_ICONS.failed}
                    <div className="flex-1 min-w-0 text-slate-300">
                      <p className="font-medium">{r.passed ? 'Passed' : 'Failed'} — Case {i + 1}</p>
                      {!r.passed && (
                        <div className="mt-1 space-y-0.5 text-slate-400">
                          {r.input && r.input !== '[hidden]' && <p>Input: <code className="text-slate-300">{r.input}</code></p>}
                          {r.expectedOutput !== '[hidden]' && <p>Expected: <code className="text-emerald-400">{r.expectedOutput}</code></p>}
                          {r.actualOutput !== '[incorrect]' && <p>Got: <code className="text-red-400">{r.actualOutput || '(empty)'}</code></p>}
                          {r.error && <p className="text-amber-400">Error: {r.error}</p>}
                        </div>
                      )}
                      <p className="text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={10} /> {r.executionTime}ms</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  {visibleTestCases.map((tc, i) => (
                    <div key={i} className="bg-[#2d2d2d] rounded-lg p-2.5 text-xs text-slate-400">
                      <p className="font-medium text-slate-300 mb-1">Case {i + 1}</p>
                      {tc.input && <p>Input: <code className="text-slate-200">{tc.input}</code></p>}
                      <p>Expected: <code className="text-slate-200">{tc.expectedOutput}</code></p>
                    </div>
                  ))}
                  {visibleTestCases.length === 0 && (
                    <p className="text-slate-500 text-xs">Run your code to see results</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Output tab */}
          {activeTab === 'output' && (
            <div className="font-mono text-xs">
              {runResult?.customOutput ? (
                <>
                  {runResult.customOutput.stdout ? (
                    <div>
                      <p className="text-slate-400 mb-1">Output:</p>
                      <pre className="text-emerald-400 whitespace-pre-wrap">{runResult.customOutput.stdout}</pre>
                    </div>
                  ) : (
                    <p className="text-slate-500">(no output)</p>
                  )}
                  {runResult.customOutput.stderr && (
                    <div className="mt-2">
                      <p className="text-slate-400 mb-1">Error:</p>
                      <pre className="text-red-400 whitespace-pre-wrap">{runResult.customOutput.stderr}</pre>
                    </div>
                  )}
                  {runResult.customOutput.timedOut && (
                    <p className="text-amber-400">⏱ Time Limit Exceeded</p>
                  )}
                  {runResult.customOutput.exitCode !== undefined && runResult.customOutput.exitCode !== 0 && !runResult.customOutput.timedOut && (
                    <p className="text-amber-400 mt-1">Exit code: {runResult.customOutput.exitCode}</p>
                  )}
                  <p className="text-slate-500 mt-2 flex items-center gap-1">
                    <Clock size={10} /> {runResult.customOutput.executionTime}ms
                  </p>
                </>
              ) : (
                <p className="text-slate-500">Click Run to see output</p>
              )}
            </div>
          )}

          {/* Custom Input tab */}
          {activeTab === 'custom' && (
            <div className="space-y-2">
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter custom stdin input..."
                rows={3}
                className="w-full bg-[#2d2d2d] border border-[#3e3e3e] text-slate-200 text-xs font-mono rounded-lg p-2 focus:outline-none focus:border-primary-500 resize-none"
              />
              <button
                onClick={handleRunCustom}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                {running ? <Spinner size="sm" className="border-white/20 border-t-white" /> : <Terminal size={13} />}
                Run with Input
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingEditor;
