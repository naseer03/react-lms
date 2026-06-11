import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-8xl font-extrabold text-primary-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Page Not Found</h2>
        <p className="text-slate-500 mb-8">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          <Home size={16} /> Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
