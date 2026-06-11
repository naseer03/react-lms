import { useRef } from 'react';
import { Upload, X } from 'lucide-react';

const QuestionRenderer = ({ question, answer, onChange, readOnly = false }) => {
  const fileRef = useRef(null);

  const handleOptionChange = (optionId, isMulti) => {
    if (readOnly) return;
    if (isMulti) {
      const current = answer?.selectedOptions || [];
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      onChange({ selectedOptions: updated });
    } else {
      onChange({ selectedOptions: [optionId] });
    }
  };

  const handleTextChange = (val) => {
    if (!readOnly) onChange({ textAnswer: val });
  };

  switch (question.type) {
    case 'mcq_single':
      return (
        <div className="space-y-2.5 mt-4">
          {question.options?.map((opt) => {
            const isSelected = answer?.selectedOptions?.includes(opt._id);
            const isCorrect = readOnly && opt.isCorrect;
            const isWrong = readOnly && isSelected && !opt.isCorrect;
            return (
              <label
                key={opt._id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  readOnly ? 'cursor-default' : 'hover:border-primary-300 hover:bg-primary-50'
                } ${
                  isCorrect ? 'border-emerald-400 bg-emerald-50' :
                  isWrong ? 'border-red-400 bg-red-50' :
                  isSelected ? 'border-primary-500 bg-primary-50' :
                  'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question._id}`}
                  checked={isSelected || false}
                  onChange={() => handleOptionChange(opt._id, false)}
                  disabled={readOnly}
                  className="mt-0.5 accent-primary-600 flex-shrink-0"
                />
                <span className={`text-sm leading-relaxed ${isCorrect ? 'text-emerald-800 font-medium' : isWrong ? 'text-red-700' : 'text-slate-700'}`}>
                  {opt.text}
                  {isCorrect && <span className="ml-2 text-emerald-600 text-xs font-semibold">✓ Correct</span>}
                  {isWrong && <span className="ml-2 text-red-500 text-xs font-semibold">✗ Wrong</span>}
                </span>
              </label>
            );
          })}
        </div>
      );

    case 'mcq_multi':
      return (
        <div className="space-y-2.5 mt-4">
          <p className="text-xs text-slate-500 italic">Select all that apply</p>
          {question.options?.map((opt) => {
            const isSelected = answer?.selectedOptions?.includes(opt._id);
            const isCorrect = readOnly && opt.isCorrect;
            const isWrong = readOnly && isSelected && !opt.isCorrect;
            return (
              <label
                key={opt._id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  readOnly ? 'cursor-default' : 'hover:border-primary-300 hover:bg-primary-50'
                } ${
                  isCorrect ? 'border-emerald-400 bg-emerald-50' :
                  isWrong ? 'border-red-400 bg-red-50' :
                  isSelected ? 'border-primary-500 bg-primary-50' :
                  'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected || false}
                  onChange={() => handleOptionChange(opt._id, true)}
                  disabled={readOnly}
                  className="mt-0.5 accent-primary-600 flex-shrink-0 w-4 h-4"
                />
                <span className={`text-sm leading-relaxed ${isCorrect ? 'text-emerald-800 font-medium' : isWrong ? 'text-red-700' : 'text-slate-700'}`}>
                  {opt.text}
                  {isCorrect && <span className="ml-2 text-emerald-600 text-xs font-semibold">✓ Correct</span>}
                  {isWrong && <span className="ml-2 text-red-500 text-xs font-semibold">✗ Wrong</span>}
                </span>
              </label>
            );
          })}
        </div>
      );

    case 'short_text':
      return (
        <div className="mt-4">
          <input
            type="text"
            className={`input ${readOnly ? 'bg-slate-50 cursor-default' : ''}`}
            placeholder="Type your answer here..."
            value={answer?.textAnswer || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            readOnly={readOnly}
            maxLength={500}
          />
          {readOnly && question.expectedAnswer && (
            <p className="text-sm text-emerald-700 mt-2 font-medium">
              Expected: <span className="font-normal">{question.expectedAnswer}</span>
            </p>
          )}
        </div>
      );

    case 'long_essay':
      return (
        <div className="mt-4">
          <textarea
            className={`input resize-none ${readOnly ? 'bg-slate-50 cursor-default' : ''}`}
            placeholder="Write your detailed answer here..."
            value={answer?.textAnswer || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            readOnly={readOnly}
            rows={8}
            maxLength={question.wordLimit > 0 ? question.wordLimit * 7 : undefined}
          />
          {!readOnly && question.wordLimit > 0 && (
            <p className="text-xs text-slate-400 mt-1 text-right">
              Word limit: ~{question.wordLimit} words
            </p>
          )}
        </div>
      );

    case 'file_upload':
      return (
        <div className="mt-4">
          {!readOnly ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={question.allowedFileTypes?.join(',') || '*'}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) onChange({ fileAnswer: { name: file.name, file } });
                }}
              />
              <Upload size={28} className="mx-auto text-slate-400 mb-2" />
              {answer?.fileAnswer ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-primary-700 font-medium">{answer.fileAnswer.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); onChange({ fileAnswer: null }); }} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Click to upload file</p>
                  {question.allowedFileTypes?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">Allowed: {question.allowedFileTypes.join(', ')}</p>
                  )}
                  {question.maxFileSize && (
                    <p className="text-xs text-slate-400">Max size: {question.maxFileSize}MB</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500">
              {answer?.fileAnswer ? `File uploaded: ${answer.fileAnswer.originalName || answer.fileAnswer.filename}` : 'No file uploaded'}
            </div>
          )}
        </div>
      );

    default:
      return <p className="text-slate-400 mt-4 text-sm italic">Unsupported question type: {question.type}</p>;
  }
};

export default QuestionRenderer;
