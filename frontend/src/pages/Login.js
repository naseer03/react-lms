import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Lock, User } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await login(data);
      toast.success('Login successful!');
      if (result.mustChangePassword) {
        navigate('/change-password');
      } else if (result.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-secondary-600 flex-col justify-center items-center p-12 text-white">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-lg">
          <GraduationCap size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold mb-4 text-center leading-tight">
          Learning Management<br />System
        </h1>
        <p className="text-primary-100 text-center text-lg leading-relaxed max-w-sm">
          Your complete platform for delivering world-class education and training.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-sm">
          {[
            { label: 'Courses', value: '50+' },
            { label: 'Students', value: '1,200+' },
            { label: 'Certificates', value: '800+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-primary-200 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">LMS Platform</span>
          </div>

          <div className="bg-white rounded-2xl shadow-modal border border-slate-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
              <p className="text-slate-500 mt-1 text-sm">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Identifier */}
              <div>
                <label className="label">Email or Mobile Number</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('identifier', { required: 'Email or mobile is required' })}
                    type="text"
                    className={`input pl-9 ${errors.identifier ? 'border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="Enter email or mobile"
                  />
                </div>
                {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    className={`input pl-9 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} LMS Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
