import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const ChangePassword = () => {
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully. Please log in again.');
      await fetchMe();
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const InputField = ({ name, label, field, placeholder, rules }) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          {...register(name, rules)}
          type={show[field] ? 'text' : 'password'}
          className={`input pl-9 pr-10 ${errors[name] ? 'border-red-400' : ''}`}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => toggle(field)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Change Password</h2>
            <p className="text-sm text-amber-600 font-medium">Action required before continuing</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
          For your security, you must change your temporary password before accessing the platform.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <InputField name="currentPassword" label="Current Password" field="current" placeholder="Enter current password"
            rules={{ required: 'Current password is required' }} />
          <InputField name="newPassword" label="New Password" field="new" placeholder="Min 8 chars, uppercase + number"
            rules={{
              required: 'New password is required',
              minLength: { value: 8, message: 'Min 8 characters' },
              pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must contain uppercase, lowercase, and number' },
            }} />
          <InputField name="confirmPassword" label="Confirm New Password" field="confirm" placeholder="Re-enter new password"
            rules={{
              required: 'Please confirm your password',
              validate: (v) => v === watch('newPassword') || 'Passwords do not match',
            }} />
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
