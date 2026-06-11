import { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const TestTimer = ({ durationMinutes, onTimeUp, onTick }) => {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (durationMinutes <= 0) return; // unlimited

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        onTick?.(next);
        if (next <= 0) {
          clearInterval(intervalRef.current);
          onTimeUp?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line

  if (durationMinutes <= 0) return null;

  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const isWarning = secondsLeft <= 5 * 60; // < 5 min
  const isDanger = secondsLeft <= 60;       // < 1 min

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono font-semibold text-sm ${
      isDanger ? 'bg-red-100 text-red-700 animate-pulse' :
      isWarning ? 'bg-amber-100 text-amber-700' :
      'bg-slate-100 text-slate-700'
    }`}>
      {isWarning ? <AlertTriangle size={16} /> : <Clock size={16} />}
      <span>
        {hours > 0 && `${hours}:`}
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

export default TestTimer;
