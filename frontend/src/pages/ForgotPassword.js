import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '../services/auth.service';
import { GraduationCap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { useSettings } from '../contexts/SettingsContext';

const ForgotPassword = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmittedEmail(email);
      setSent(true);
    } catch {
      // Always show success even on error — prevents user enumeration
      setSubmittedEmail(email);
      setSent(true);
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
          Enter your registered email address and we'll send you a secure link to reset your password.
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
            {!sent ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Forgot password?</h2>
                  <p className="text-slate-500 mt-1 text-sm">
                    No worries — we'll send a reset link to your email.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                        })}
                        type="email"
                        autoComplete="email"
                        autoFocus
                        className={`input pl-9 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  If <span className="font-semibold text-slate-700">{submittedEmail}</span> is
                  registered, you'll receive a password reset link shortly.
                </p>
                <p className="text-slate-400 text-xs mt-3">
                  Didn't receive it? Check your spam folder or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
