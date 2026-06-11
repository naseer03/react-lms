import { useQuery } from '@tanstack/react-query';
import { certificateService } from '../../services/certificate.service';
import Spinner from '../../components/ui/Spinner';
import { Award, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const StudentCertificates = () => {
  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => certificateService.getMine().then(r => r.data.data.certificates),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Certificates</h1>
        <p className="text-slate-500 text-sm mt-0.5">{certs.length} certificate{certs.length !== 1 ? 's' : ''} earned</p>
      </div>

      {certs.length === 0 ? (
        <div className="card text-center py-16">
          <Award size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No certificates yet</p>
          <p className="text-slate-400 text-sm mt-1">Complete a course to earn your certificate</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {certs.map((cert) => (
            <div key={cert._id} className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow">
              {/* Certificate visual header */}
              <div className="bg-gradient-to-br from-primary-600 to-secondary-600 p-6 text-white text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award size={28} className="text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-200 mb-1">Certificate of Completion</p>
                <p className="font-mono text-xs text-white/60">{cert.certificateNumber}</p>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Course</p>
                  <p className="font-semibold text-slate-800 text-sm leading-snug">{cert.courseName}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Completed {cert.completionDate ? format(new Date(cert.completionDate), 'dd MMM yyyy') : '—'}</span>
                  <span className="badge-success flex items-center gap-1"><CheckCircle size={10} /> Active</span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 p-3 flex items-center gap-2">
                <a
                  href={certificateService.downloadUrl(cert._id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary flex-1 !py-2 text-xs"
                >
                  <Download size={13} /> Download PDF
                </a>
                <a
                  href={cert.verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !py-2 !px-3"
                  title="Verify certificate"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCertificates;
