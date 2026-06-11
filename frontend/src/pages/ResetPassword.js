import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';
import { GraduationCap, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { useSettings } from '../contexts/SettingsContext';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async ({ password }) => {
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const appName = settings?.instituteName || 'LMS Platform';
  const logo = settings?.logo;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-secondary-600 flex-col justify-center items-center p-12 text-white">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-lg">
          {logo
            ? <img src={`/uploads/${logo}`} alt={appName} className="w-14 h-14 object-contain" />
            : <GraduationCap size={40} className="text-white" />
          }
        </div>
        <h1 className="text-4xl font-extrabold mb-4 text-center leading-tight">{appName}</h1>
        <p className="text-primary-100 text-center text-lg leading-relaxed max-w-sm">
          Choose a strong password — at least 8 characters with uppercase, lowercase, and a number.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
              {logo
                ? <img src={`/uploads/${logo}`} alt={appName} className="w-full h-full object-contain" />
                : <GraduationCap size={22} className="text-white" />
              }
            </div>
            <span className="text-xl font-bold text-slate-800">{appName}</span>
          </div>

          <div className="bg-white rounded-2xl shadow-modal border border-slate-100 p-8">
            {!done ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Set new password</h2>
                  <p className="text-slate-500 mt-1 text-sm">
                    Must be at least 8 characters with uppercase, lowercase, and a number.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* New password */}
                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 8, message: 'At least 8 characters required' },
                          pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message: 'Must include uppercase, lowercase, and a number',
                          },
                        })}
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        className={`input pl-9 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                        placeholder="New password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="label">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: (v) => v === watch('password') || 'Passwords do not match',
                        })}
                        type={showConfirm ? 'text' : 'password'}
                        className={`input pl-9 pr-10 ${errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Password strength hint */}
                  <PasswordStrength value={watch('password') || ''} />

                  <button
                    type="submit"
                    className="btn-primary w-full py-3 text-base"
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : 'Reset Password'}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Password reset!</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Your password has been changed successfully. You can now log in with your new password.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary px-8 py-2.5"
                >
                  Go to Login
                </button>
              </div>
            )}

            {!done && (
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

/* Simple visual password strength indicator */
const PasswordStrength = ({ value }) => {
  if (!value) return null;

  const checks = [
    { label: '8+ characters', pass: value.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(value) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(value) },
    { label: 'Number', pass: /\d/.test(value) },
  ];

  const passed = checks.filter(c => c.pass).length;
  const colors = ['bg-red-400', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < passed ? colors[passed] : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {checks.map(({ label, pass }) => (
          <p
            key={label}
            className={`text-xs flex items-center gap-1 ${pass ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pass ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {label}
          </p>
        ))}
      </div>
    </div>
  );
};

export default ResetPassword;
