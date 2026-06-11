import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import { User, Phone, Lock, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-400"
  />
);

const StudentProfile = () => {
  const { user, updateUser } = useAuth();

  // ── Profile form state ──────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'success'|'error', text }

  // ── Password form state ─────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // ── Handle profile update ───────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim()) { setProfileMsg({ type: 'error', text: 'Name is required.' }); return; }
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
      setProfileMsg({ type: 'error', text: 'Enter a valid 10-digit mobile number.' }); return;
    }
    setProfileLoading(true);
    try {
      const { data } = await authService.updateProfile({ name: name.trim(), mobile: mobile || null });
      updateUser(data.data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Handle password change ──────────────────────────────
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMsg({ type: 'error', text: 'All password fields are required.' }); return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return;
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setPwMsg({ type: 'error', text: 'Password must be 8+ chars with uppercase, lowercase, and a number.' }); return;
    }
    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your personal details and security settings</p>
      </div>

      {/* Avatar + email (read-only) */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-lg">{user?.name}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <span className="inline-block mt-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium capitalize">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Personal info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-slate-700">Personal Information</h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <Field label="Full Name">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              maxLength={100}
            />
          </Field>

          <Field label="Email Address">
            <Input type="email" value={user?.email || ''} disabled />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact admin if needed.</p>
          </Field>

          <Field label="Mobile Number">
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          </Field>

          {profileMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              profileMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {profileMsg.type === 'success' && <CheckCircle size={14} />}
              {profileMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary flex items-center gap-2 !py-2 !px-4"
            >
              {profileLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {profileLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-slate-700">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          {[
            { label: 'Current Password', value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: 'New Password', value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm New Password', value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(({ label, value, set, show, toggle }) => (
            <Field key={label} label={label}>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
                <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
          ))}

          <p className="text-xs text-slate-400">
            Password must be at least 8 characters and contain uppercase, lowercase, and a number.
          </p>

          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              pwMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {pwMsg.type === 'success' && <CheckCircle size={14} />}
              {pwMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwLoading}
              className="btn-primary flex items-center gap-2 !py-2 !px-4"
            >
              {pwLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock size={14} />
              )}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentProfile;
