import { useState, useRef } from 'react';
import { videoService } from '../../services/video.service';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoUploader = ({ lessonId, courseId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDoc, setVideoDoc] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  const startPolling = (videoId) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await videoService.getStatus(videoId);
        const { status } = data.data.video;
        if (status === 'ready') {
          clearInterval(pollRef.current);
          setPolling(false);
          setVideoDoc((v) => ({ ...v, status: 'ready' }));
          toast.success('Video processed and ready!');
          onUploadComplete?.(data.data.video);
        } else if (status === 'failed') {
          clearInterval(pollRef.current);
          setPolling(false);
          setVideoDoc((v) => ({ ...v, status: 'failed' }));
          toast.error('Video processing failed');
        }
      } catch {}
    }, 5000);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data } = await videoService.upload(file, lessonId, courseId, setProgress);
      const vid = data.data.video;
      setVideoDoc(vid);
      setUploading(false);
      toast.success('Video uploaded! Processing started...');
      startPolling(vid._id);
    } catch (err) {
      setUploading(false);
      toast.error(err.response?.data?.message || 'Upload failed');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const StatusIcon = () => {
    if (!videoDoc) return null;
    if (videoDoc.status === 'ready') return <CheckCircle size={20} className="text-emerald-500" />;
    if (videoDoc.status === 'failed') return <AlertCircle size={20} className="text-red-500" />;
    return <Loader size={20} className="text-primary-500 animate-spin" />;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && !polling && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          uploading || polling
            ? 'border-primary-300 bg-primary-50 cursor-not-allowed'
            : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <Upload size={32} className="mx-auto text-slate-400 mb-3" />
        {uploading ? (
          <div>
            <p className="text-sm font-medium text-primary-700 mb-2">Uploading...</p>
            <div className="w-full bg-primary-100 rounded-full h-2 max-w-xs mx-auto">
              <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{progress}%</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-600">Drop video here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — up to 2GB</p>
          </div>
        )}
      </div>

      {/* Status */}
      {videoDoc && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          videoDoc.status === 'ready' ? 'bg-emerald-50 border-emerald-200' :
          videoDoc.status === 'failed' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <StatusIcon />
          <div className="flex-1 text-sm">
            {videoDoc.status === 'ready' && <p className="text-emerald-700 font-medium">Video is ready for streaming</p>}
            {videoDoc.status === 'failed' && <p className="text-red-700 font-medium">Processing failed. Please re-upload.</p>}
            {(videoDoc.status === 'processing' || videoDoc.status === 'uploading') && (
              <p className="text-blue-700 font-medium">Converting to HLS format...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
