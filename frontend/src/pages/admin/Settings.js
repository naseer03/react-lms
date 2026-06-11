import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../../services/settings.service';
import { useSettings } from '../../contexts/SettingsContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import { Upload, Save, Building, Award, Database } from 'lucide-react';
import api from '../../services/api';

const TABS = [
  { id: 'branding', label: 'Institute Branding', icon: Building },
  { id: 'certificate', label: 'Certificate Template', icon: Award },
  { id: 'backup', label: 'Backup & System', icon: Database },
];

const Settings = () => {
  const queryClient = useQueryClient();
  const { refetch: refetchBranding } = useSettings();
  const [tab, setTab] = useState('branding');
  const [saving, setSaving] = useState(false);
  const [assetLoading, setAssetLoading] = useState({});
  const [backupLoading, setBackupLoading] = useState({});

  // FIX: Use plain refs directly instead of passing `ref` as a prop to child
  // components. React does NOT pass `ref` through as a regular prop to function
  // components — it would always be undefined inside the child.
  const logoRef = useRef(null);
  const bgRef = useRef(null);
  const sigRef = useRef(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.get().then(r => r.data.data.settings),
  });

  // FIX: Also pull `watch` and `setValue` so color pickers can be controlled
  // without double-registering the same field name (which breaks RHF's ref tracking).
  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
    values: settings || {},
  });

  const primaryColor = watch('primaryColor') || '#4f46e5';
  const certBorderColor = watch('certBorderColor') || '#4f46e5';
  const certAccentColor = watch('certAccentColor') || '#7c3aed';

  const onSave = async (data) => {
    setSaving(true);
    try {
      await settingsService.update(data);
      toast.success('Settings saved');
      queryClient.invalidateQueries(['settings']);
      refetchBranding(); // re-apply color + name across the whole app immediately
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleAssetUpload = async (type, file) => {
    if (!file) return;
    setAssetLoading(p => ({ ...p, [type]: true }));
    try {
      const fns = {
        logo: settingsService.uploadLogo,
        background: settingsService.uploadBackground,
        signature: settingsService.uploadSignature,
      };
      await fns[type](file);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded`);
      queryClient.invalidateQueries(['settings']);
    } catch { toast.error('Upload failed'); }
    finally { setAssetLoading(p => ({ ...p, [type]: false })); }
  };

  const handleBackup = async (type) => {
    setBackupLoading(p => ({ ...p, [type]: true }));
    try {
      await api.post(`/backups/${type}`);
      toast.success(`${type === 'database' ? 'Database' : 'Media'} backup started`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Backup failed');
    } finally {
      setBackupLoading(p => ({ ...p, [type]: false }));
    }
  };

  // FIX: AssetUploader now receives `inputRef` (a plain prop) instead of `ref`
  // (which React intercepts and never forwards to function components).
  const AssetUploader = ({ label, field, inputRef, type }) => (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        {settings?.[field] && (
          <img
            src={`/uploads/${settings[field]}`}
            alt={label}
            className="w-16 h-12 object-contain rounded-lg border border-slate-200 bg-slate-50"
          />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-xs flex items-center gap-1"
          disabled={assetLoading[type]}
        >
          {assetLoading[type] ? <Spinner size="sm" /> : <><Upload size={12} /> Upload</>}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { handleAssetUpload(type, e.target.files[0]); e.target.value = ''; }}
        />
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure institute branding and system settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white shadow-sm text-primary-700' : 'text-slate-600 hover:text-slate-800'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-5">

        {/* ── Branding Tab ── */}
        {tab === 'branding' && (
          <div className="card space-y-5">
            <h2 className="text-base font-semibold text-slate-800">Institute Information</h2>

            <div>
              <label className="label">Institute Name</label>
              <input {...register('instituteName')} className="input" placeholder="My Institute" />
            </div>

            {/* FIX: Color picker uses watch/setValue; text input uses register.
                Never call register() twice on the same field name — RHF only
                tracks one ref per field and the picker ends up disconnected. */}
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setValue('primaryColor', e.target.value, { shouldDirty: true })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-1"
                />
                <input
                  {...register('primaryColor')}
                  className="input w-36"
                  placeholder="#4f46e5"
                />
              </div>
            </div>

            {/* FIX: Pass inputRef as a plain prop — NOT ref */}
            <AssetUploader label="Institute Logo" field="logo" inputRef={logoRef} type="logo" />
          </div>
        )}

        {/* ── Certificate Tab ── */}
        {tab === 'certificate' && (
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Certificate Template</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Header Text</label>
                <input {...register('certHeaderText')} className="input" />
              </div>
              <div>
                <label className="label">Sub-header Text</label>
                <input {...register('certSubHeaderText')} className="input" />
              </div>
              <div>
                <label className="label">Body Text</label>
                <input {...register('certBodyText')} className="input" />
              </div>
              <div>
                <label className="label">Footer Text</label>
                <input {...register('certFooterText')} className="input" />
              </div>
              <div>
                <label className="label">Signatory Name</label>
                <input {...register('certSignatoryName')} className="input" />
              </div>
              <div>
                <label className="label">Signatory Title</label>
                <input {...register('certSignatoryTitle')} className="input" />
              </div>

              {/* FIX: Same watch/setValue pattern for cert color pickers */}
              <div>
                <label className="label">Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={certBorderColor}
                    onChange={(e) => setValue('certBorderColor', e.target.value, { shouldDirty: true })}
                    className="w-10 h-9 rounded border border-slate-200 p-1 cursor-pointer"
                  />
                  <input {...register('certBorderColor')} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={certAccentColor}
                    onChange={(e) => setValue('certAccentColor', e.target.value, { shouldDirty: true })}
                    className="w-10 h-9 rounded border border-slate-200 p-1 cursor-pointer"
                  />
                  <input {...register('certAccentColor')} className="input" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AssetUploader label="Certificate Background" field="certBackground" inputRef={bgRef} type="background" />
              <AssetUploader label="Signatory Signature" field="certSignature" inputRef={sigRef} type="signature" />
            </div>
          </div>
        )}

        {/* ── Backup Tab ── */}
        {tab === 'backup' && (
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Backup & System</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Automated Backup Schedule</p>
              <p>• Database: Daily at 2:00 AM (IST)</p>
              <p>• Media files: Every Sunday at 3:00 AM (IST)</p>
              <p>• Backups are uploaded to Google Drive automatically</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => handleBackup('database')}
                disabled={backupLoading.database}
                className="btn-secondary flex-1 flex items-center justify-center gap-2">
                {backupLoading.database ? <Spinner size="sm" /> : <Database size={14} />}
                Backup Database Now
              </button>
              <button type="button" onClick={() => handleBackup('media')}
                disabled={backupLoading.media}
                className="btn-secondary flex-1 flex items-center justify-center gap-2">
                {backupLoading.media ? <Spinner size="sm" /> : <Upload size={14} />}
                Backup Media Now
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Google Client ID</label>
                <p className="text-xs text-slate-400 mt-1">Set via environment variable GOOGLE_CLIENT_ID</p>
              </div>
              <div>
                <label className="label">Google Drive Folder ID</label>
                <p className="text-xs text-slate-400 mt-1">Set via environment variable GOOGLE_DRIVE_FOLDER_ID</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        {tab !== 'backup' && (
          <div className="flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving ? <Spinner size="sm" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;
