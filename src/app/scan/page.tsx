"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useProducts } from "../../context/ProductsContext";
import ProductList from "../../components/ProductList";

export default function ScanPage() {
  const { scanProduct } = useProducts();
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Initialize scanner instance only
  useEffect(() => {
    const elementId = "qr-scanner";
    
    try {
      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;
      setIsInitialized(true);
    } catch (err) {
      console.error("Error initializing scanner:", err);
      setMessage("Failed to initialize QR scanner.");
    }

    // Cleanup on unmount
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, []);

  // Request camera permission and get camera list
  const requestCameraPermission = async () => {
    setPermissionRequested(true);
    setMessage("Requesting camera permission...");
    
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // Request camera permission with simpler constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionGranted(true);
      setMessage("Camera permission granted! Loading cameras...");
      
      // Small delay to ensure permission is fully granted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now get the list of cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length > 0) {
          const cameraList = devices.map((device) => ({
            id: device.id,
            label: device.label || `Camera ${device.id.substring(0, 8)}`
          }));
          
          setCameras(cameraList);
          
          // Select back camera by default
          const backCamera = cameraList.find(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.toLowerCase().includes('environment') ||
            cam.label.toLowerCase().includes('rear')
          );
          
          setSelectedCamera(backCamera?.id || cameraList[0].id);
          setMessage("✓ Cameras loaded! Click 'Start Camera Scanner' to begin.");
        } else {
          setMessage("⚠️ No cameras detected. Will try to use default camera.");
          setSelectedCamera("default");
          setCameras([{ id: "default", label: "Default Camera" }]);
        }
      } catch (err) {
        console.error("Error getting cameras:", err);
        setMessage("⚠️ Cannot list cameras, but will try default camera. Click 'Start' to try.");
        setSelectedCamera("default");
        setCameras([{ id: "default", label: "Default Camera" }]);
      }
    } catch (err: any) {
      console.error("Permission error:", err);
      setPermissionRequested(false);
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMessage("❌ Camera permission denied. Please click 'Allow' when your browser asks for camera access.");
      } else if (err.name === "NotFoundError" || err.message?.includes("not found")) {
        setMessage("❌ No camera found on this device. Please connect a camera or use manual entry.");
      } else if (err.message?.includes("not supported")) {
        setMessage("❌ Camera not supported in this browser. Please use Chrome, Firefox, or Safari. Or use manual entry.");
      } else if (err.name === "NotReadableError") {
        setMessage("❌ Camera is already in use by another application. Please close other apps and try again.");
      } else {
        setMessage(`❌ Camera error: ${err.message || "Unknown error"}. Try manual entry or a different browser.`);
      }
      
      setPermissionGranted(false);
    }
  };

  // Handle QR code decode
  const onScanSuccess = (decodedText: string) => {
    console.log("QR Code scanned:", decodedText);
    
    // Parse the product ID
    const parts = decodedText.split("|");
    const productId = parts[0].trim();
    
    // Update product
    const result = scanProduct(productId);
    
    if (result.success) {
      setMessage(`✓ Scanned: ${result.product?.name} — Quantity: ${result.product?.quantity}`);
    } else {
      setMessage(`✗ ${result.message || "Scan failed"}`);
    }
    
    // Stop scanner after successful scan
    stopScanner();
  };

  const onScanError = (errorMessage: string) => {
    // Ignore scan errors (they happen frequently while scanning)
  };

  // Start the scanner
  const startScanner = async () => {
    if (!scannerRef.current) {
      setMessage("Scanner not ready.");
      return;
    }

    if (!permissionGranted) {
      setMessage("Please grant camera permission first.");
      return;
    }

    try {
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // Try with selected camera first, fall back to constraints
      if (selectedCamera && selectedCamera !== "default") {
        await scannerRef.current.start(
          selectedCamera,
          config,
          onScanSuccess,
          onScanError
        );
      } else {
        // Use constraints as fallback
        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        );
      }
      
      setScanning(true);
      setMessage("✓ Scanner active - point at a QR code to scan");
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        setMessage("❌ Camera permission denied. Please allow camera access and try again.");
        setPermissionGranted(false);
      } else if (err.message?.includes("Camera already in use")) {
        setMessage("❌ Camera is already in use. Please close other apps using the camera.");
      } else {
        setMessage("❌ Unable to start camera. Try selecting a different camera or use manual entry.");
      }
      setScanning(false);
    }
  };

  // Stop the scanner
  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
        setMessage("Scanner stopped.");
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  // Handle camera change
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    
    // If scanner is running, restart with new camera
    if (scanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner();
      }, 500);
    }
  };

  // Manual product ID submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input = document.getElementById("manual-id") as HTMLInputElement;
    const productId = input.value.trim();
    
    if (!productId) {
      setMessage("Please enter a product ID.");
      return;
    }

    const result = scanProduct(productId);
    
    if (result.success) {
      setMessage(`✓ Scanned: ${result.product?.name} — Quantity: ${result.product?.quantity}`);
      input.value = "";
    } else {
      setMessage(`✗ ${result.message || "Product not found"}`);
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Scan QR Code</h1>

      {/* Camera Scanner Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Camera Scanner</h2>
        
        {/* Permission Request */}
        {!permissionGranted && !permissionRequested && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              📸 Camera access is required to scan QR codes.
            </p>
            <button
              onClick={requestCameraPermission}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Request Camera Permission
            </button>
          </div>
        )}

        {/* Loading state */}
        {permissionRequested && !permissionGranted && cameras.length === 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏳ Requesting camera access...
            </p>
          </div>
        )}

        {/* Camera Selection */}
        {permissionGranted && cameras.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Camera:</label>
            <select
              value={selectedCamera || ""}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={scanning}
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner Display */}
        {permissionGranted && (
          <>
            <div className="mb-4">
              <div 
                id="qr-scanner" 
                className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden"
                style={{ minHeight: "300px" }}
              />
            </div>

            {/* Scanner Controls */}
            <div className="flex gap-2 justify-center">
              {!scanning ? (
                <button
                  onClick={startScanner}
                  disabled={!isInitialized}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Start Camera Scanner
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Stop Camera Scanner
                </button>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Point your camera at a QR code to scan it automatically.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Manual Entry Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Manual Entry</h2>
        <p className="text-sm text-gray-600 mb-3">
          Don't have camera access? Enter the product ID manually:
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            id="manual-id"
            type="text"
            className="flex-1 border border-gray-300 rounded px-3 py-2"
            placeholder="Enter product ID (e.g., PROD-1234567890)"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Submit
          </button>
        </form>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes("✓") 
            ? "bg-green-50 border border-green-200 text-green-800" 
            : message.includes("❌")
            ? "bg-red-50 border border-red-200 text-red-800"
            : message.includes("⚠️")
            ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
            : "bg-blue-50 border border-blue-200 text-blue-800"
        }`}>
          <p className="font-medium">{message}</p>
        </div>
      )}

      {/* Troubleshooting Section */}
      {!permissionGranted && permissionRequested && (
        <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Troubleshooting</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium">If camera access isn't working, please check:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You're using <strong>HTTPS</strong> (check URL starts with https://)</li>
              <li>Browser is <strong>Chrome, Firefox, Safari, or Edge</strong></li>
              <li>Click <strong>"Allow"</strong> when browser asks for camera permission</li>
              <li>Check browser address bar for a camera icon 🎥 - click to allow</li>
              <li>No other app or tab is using the camera</li>
              <li>Try refreshing the page and clicking "Request Camera Permission" again</li>
              <li>Check browser settings → Site permissions → Camera → Allow</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <button
                onClick={() => {
                  setPermissionRequested(false);
                  setPermissionGranted(false);
                  setMessage(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Current Inventory</h2>
        <ProductList />
      </div>
    </main>
  );
}