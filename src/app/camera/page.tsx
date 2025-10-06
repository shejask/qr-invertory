"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setHasPermission(true);
        setError(null);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("❌ Camera permission denied. Please allow access and refresh.");
      } else if (err.name === "NotFoundError") {
        setError("❌ No camera found on this device.");
      } else {
        setError("❌ Failed to open camera. Check browser permissions.");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">Camera Preview</h1>

      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {!hasPermission && !error && (
        <button
          onClick={startCamera}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🎥 Start Camera
        </button>
      )}

      <div className="w-full max-w-md aspect-[3/4] bg-black rounded-lg overflow-hidden mt-4">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        ></video>
      </div>

      {hasPermission && (
        <p className="mt-4 text-gray-600 text-sm">
          ✅ Camera is active — point it at your object.
        </p>
      )}
    </main>
  );
}
