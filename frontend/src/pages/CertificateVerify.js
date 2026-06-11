import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { certificateService } from '../services/certificate.service';
import Spinner from '../components/ui/Spinner';
import { CheckCircle, XCircle, Award, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

const CertificateVerify = () => {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify-cert', id],
    queryFn: () => certificateService.verify(id).then(r => r.data.data),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-card border border-slate-100">
            <GraduationCap size={20} className="text-primary-600" />
            <span className="font-bold text-slate-800">LMS Platform</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-4">Certificate Verification</h1>
          <p className="text-slate-500 text-sm mt-1">Verify the authenticity of this certificate</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-modal border border-slate-100 overflow-hidden">
          {isLoading && (
            <div className="p-12 text-center">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Verifying certificate...</p>
            </div>
          )}

          {(isError || (data && !data.valid)) && !isLoading && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-red-700 mb-2">Certificate Invalid</h2>
              <p className="text-slate-500 text-sm">
                {data?.revokedReason
                  ? `This certificate has been revoked: ${data.revokedReason}`
                  : 'This certificate could not be verified. It may not exist or may have been revoked.'}
              </p>
            </div>
          )}

          {data?.valid && !isLoading && (
            <>
              {/* Valid banner */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award size={32} className="text-white" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle size={20} className="text-emerald-200" />
                  <span className="font-bold text-lg">Verified Certificate</span>
                </div>
                <p className="text-emerald-100 text-sm">This certificate is authentic and valid</p>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                {[
                  { label: 'Certificate Number', value: data.certificateNumber, mono: true },
                  { label: 'Issued To', value: data.studentName, bold: true },
                  { label: 'Course Completed', value: data.courseName, bold: true },
                  { label: 'Completion Date', value: data.completionDate ? format(new Date(data.completionDate), 'dd MMMM yyyy') : '—' },
                  { label: 'Issue Date', value: data.issuedAt ? format(new Date(data.issuedAt), 'dd MMMM yyyy') : '—' },
                  { label: 'Status', value: <span className="badge-success">Active</span> },
                ].map(({ label, value, mono, bold }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'} ${mono ? 'font-mono text-primary-700' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 border-t border-emerald-100 p-4 text-center">
                <p className="text-xs text-emerald-700">
                  ✓ This certificate was digitally verified by LMS Platform on {format(new Date(), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Certificate ID: {id}</p>
      </div>
    </div>
  );
};

export default CertificateVerify;
