import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, X, RotateCcw, Check } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onReset?: () => void;
}

export default function FileUpload({ onFileSelect, onReset }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: facingMode,
  };

  // Start camera
  const startCamera = () => setCameraActive(true);

  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `cattle-photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onFileSelect(file);
          setPreview(imageSrc);
          setCameraActive(false);
        });
    }
  }, [onFileSelect]);

  // Stop camera
  const stopCamera = () => setCameraActive(false);

  // Switch camera (front/back)
  const switchCamera = () =>
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  // Reset
  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null);
    onReset?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className=" overflow-hidden">
        {/* Initial Upload UI */}
        {!preview && !cameraActive && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-100 to-green-300 rounded-full flex items-center justify-center shadow-inner">
              <Camera className="w-12 h-12 text-green-700" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Capture or Upload Image
              </h3>
              <p className="text-gray-600">
                Take a photo of your cattle or upload an existing image for
                analysis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startCamera}
                className="flex cursor-pointer items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-md hover:bg-green-700 hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>

              <label className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl font-medium shadow-md hover:bg-gray-700 hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer">
                <Upload className="w-5 h-5" />
                Upload Image
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Camera Mode */}
        {cameraActive && (
          <div className="relative bg-black rounded-lg">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full max-h-96 object-contain rounded-lg"
              onUserMediaError={(error) => {
                console.error("Webcam error:", error);
                setCameraActive(false);
              }}
            />

            <div className="absolute bottom-6  left-1/2 -translate-x-1/2 flex gap-6">
              <button
                onClick={switchCamera}
                className="w-12 h-12 cursor-pointer bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-transform hover:scale-110"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={capturePhoto}
                className="w-16 h-16 cursor-pointer bg-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
              >
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
              </button>

              <button
                onClick={stopCamera}
                className="w-12 h-12 cursor-pointer  bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Preview Mode */}
        {preview && (
          <div className="relative bg-black">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-96 object-contain"
            />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <button
                onClick={handleRemove}
                className="flex items-center cursor-pointer gap-2 px-5 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg shadow-md transition-all duration-200 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Retake / Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
