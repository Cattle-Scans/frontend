import { Link } from "react-router-dom";


export default function Home() {

  return (

    <div className="min-h-screen flex items-center justify-center">

      <div className="text-center px-4">
        {/* Hero Title */}
        <h1 className="text-6xl font-extrabold text-gray-800 mb-4">
          🐄 Cattle and Breed
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-600 mb-8">
          Upload or scan your cattle image to identify its breed instantly.
        </p>

        {/* CTA Button */}
        <Link
          to="/scan"
          className="px-8 py-3 text-lg font-medium rounded-xl bg-green-600 text-white shadow-md hover:bg-green-700 transition"
        >
          Scan Your Cattle
        </Link>
      </div>
    </div>
  );
}



