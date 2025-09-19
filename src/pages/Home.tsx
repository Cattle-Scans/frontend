import { Link } from "react-router-dom";
import { Download } from "lucide-react"; // ✅ nice modern download icon

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6 max-w-2xl">
        {/* Hero Title */}
        <h1 className="text-6xl font-extrabold text-gray-800 mb-4">
          🐄 Cattle and Breed
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-600 mb-12">
          Upload or scan your cattle image to identify its breed instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">


          {/* Download Button with icon */}
          <a
            href="https://github.com/Cattle-Scans/mobile/releases/download/v1.0.0/app-release.apk"
            className="flex items-center justify-center gap-2 px-8 py-3 text-lg font-semibold
                       rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg
                       hover:scale-105 hover:shadow-xl transition-transform duration-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="w-6 h-6" />
            Download App
          </a>
        </div>
      </div>
    </div>
  );
}
