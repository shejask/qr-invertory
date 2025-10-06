"use client";

import { useEffect, useRef, useState } from "react";
import { useProducts } from "../../context/ProductsContext";
import jsQR from "jsqr";

export default function ScanPage() {
  const { products, scanProduct } = useProducts();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setHasPermission(true);
        setError(null);
      }

      setStream(mediaStream);
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

  // Process video frame and detect QR
  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !scanning) return;

    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState !== 4) return; // wait until video is ready

    // Sync canvas with video size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) handleQRCodeDetected(code.data);
    else scanFrameRef.current = requestAnimationFrame(scanQRCode);
  };

  // Handle valid QR detection
  const handleQRCodeDetected = async (qrData: string) => {
    if (qrData === lastScanned) return; // avoid duplicates
    setLastScanned(qrData);

    try {
      const productId = qrData.trim();
      const product = products.find((p) => p.id === productId);

      if (product) {
        const res = scanProduct(productId);
        if (res.success && res.product) {
          setScanMessage(`✅ ${res.product.name} — Quantity: ${res.product.quantity}`);
        } else {
          setScanMessage(`⚠️ ${product.name} — ${res.message ?? "Out of stock"}`);
        }
      } else {
        setScanMessage(`❌ Product not found in inventory`);
      }
    } catch (err) {
      console.error("QR handling error:", err);
      setScanMessage("❌ Error processing QR code");
    }

    // Reset scan after short delay
    setTimeout(() => {
      setLastScanned(null);
      setScanMessage(null);
      if (scanning) scanFrameRef.current = requestAnimationFrame(scanQRCode);
    }, 1500);
  };

  // Toggle scanning
  const toggleScanning = () => {
    if (!hasPermission) return setError("Grant camera access first.");
    setScanning((prev) => !prev);
    setScanMessage(null);
  };

  // Handle scanning loop
  useEffect(() => {
    if (scanning) {
      scanFrameRef.current = requestAnimationFrame(scanQRCode);
    } else if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    return () => {
      if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    };
  }, [scanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (scanFrameRef.current) {
        cancelAnimationFrame(scanFrameRef.current);
      }
    };
  }, [stream]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">QR Code Scanner</h1>

      {/* Error Messages */}
      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Scan Messages */}
      {scanMessage && (
        <div
          className={`p-4 mb-4 rounded-lg border ${
            scanMessage.includes("✅")
              ? "bg-green-100 text-green-700 border-green-200"
              : scanMessage.includes("⚠️")
              ? "bg-yellow-100 text-yellow-700 border-yellow-200"
              : "bg-red-100 text-red-700 border-red-200"
          }`}
        >
          {scanMessage}
        </div>
      )}

      {/* Start Camera */}
      {!hasPermission && !error && (
        <button
          onClick={startCamera}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🎥 Start Camera
        </button>
      )}

      {/* Video Preview */}
      <div className="w-full max-w-md aspect-[3/4] bg-black rounded-lg overflow-hidden mt-4 relative">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        ></video>

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 border-4 border-green-500 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-md"></div>
          </div>
        )}
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* Scan Controls */}
      {hasPermission && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={toggleScanning}
            className={`px-6 py-3 rounded-lg font-medium ${
              scanning
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {scanning ? "⏸️ Stop Scanning" : "▶️ Start Scanning"}
          </button>
          <p className="text-gray-600 text-sm text-center">
            {scanning
              ? "🔍 Scanning for QR codes..."
              : "✅ Camera active — click Start Scanning"}
          </p>
        </div>
      )}
    </main>
  );
}
