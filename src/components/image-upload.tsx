import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, X, RotateCcw, Check } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void,
  onReset?: () => void
}

export default function FileUpload({ onFileSelect, onReset }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: facingMode
  };

  // Start camera
  const startCamera = () => {
    setCameraActive(true);
  };

  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Convert base64 to blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `cattle-photo-${Date.now()}.jpg`, {
            type: "image/jpeg"
          });
          onFileSelect(file);
          setPreview(imageSrc);
          setCameraActive(false);
        });
    }
  }, [onFileSelect]);

  // Stop camera
  const stopCamera = () => {
    setCameraActive(false);
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  // Remove preview and file
  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null);
    onReset && onReset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Retake photo

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className=" rounded-2xl shadow-xl border border-green-200 overflow-hidden">
        {!preview && !cameraActive && (
          <div className="p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-50 to-green-300 rounded-full flex items-center justify-center shadow-lg">
                <Camera className="w-12 h-12 text-gray-800" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Capture or Upload Image
                </h3>
                <p className="text-gray-600">
                  Take a photo of your cattle or upload an existing image for analysis
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={startCamera}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-green-50 to-green-300  hover:cursor-pointer text-gray-800 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </button>

                <label className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:cursor-pointer text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer">
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
          </div>
        )}

        {cameraActive && (
          <div className="relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full max-h-96 object-contain bg-gray-900 rounded-lg"
              onUserMediaError={(error) => {
                console.error("Webcam error:", error);
                setCameraActive(false);
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={switchCamera}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={capturePhoto}
                className="w-16 h-16 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
              </button>

              <button
                onClick={stopCamera}
                className="w-12 h-12 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-96 object-contain bg-black"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">

              <button
                onClick={handleRemove}
                className="flex items-center gap-2 px-4 py-2 hover:cursor-pointer bg-gradient-to-r from-red-50 to-red-300 hover:bg-red-600 text-gray-800 rounded-xl font-medium transition-all duration-200 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}