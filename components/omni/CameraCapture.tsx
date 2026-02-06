
import React, { useRef, useState, useEffect } from 'react';
import Spinner from '../Spinner';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsReady(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
          <Spinner size="md" />
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Initializing Lens</p>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6">
        <button onClick={onCancel} className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white">
          ✕
        </button>
        <button onClick={takePhoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-primary shadow-xl">
          <div className="w-10 h-10 rounded-full bg-primary" />
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
