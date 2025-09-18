import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Login from "./pages/Login";
import BreedMapPage from "./pages/BreedMap";
import ExplorePage from "./pages/Explore";
import AdminPage from "./pages/Admin";

function App() {
  const location = useLocation(); // get current route

  // Function to check if a nav link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="pb-30 bg-gradient-to-b from-green-100 to-white min-h-screen transition-colors duration-500">
        <nav className="flex justify-between items-center p-5 shadow-md bg-white/80 backdrop-blur-md rounded-b-2xl sticky top-0 z-50">
          <Link
            to="/"
            className={`text-2xl font-bold transition-all duration-300 ${isActive("/")
              ? "text-gray-700 hover:text-green-600 hover:scale-105"

              : "text-gray-700 hover:text-green-600 hover:scale-105"
              }`}
          >
            Cattle Scan
          </Link>

          <div className="flex gap-6 text-lg font-medium">
            <Link
              to="/scan"
              className={`transition-colors duration-300 ${isActive("/scan")
                ? "text-green-700 underline underline-offset-4 scale-105"
                : "text-gray-700 hover:text-green-600 hover:scale-105"
                }`}
            >
              Scan
            </Link>
            <Link
              to="/explore"
              className={`transition-colors duration-300 ${isActive("/explore")
                ? "text-green-700 underline underline-offset-4 scale-105"
                : "text-gray-700 hover:text-green-600 hover:scale-105"
                }`}
            >
              Explore
            </Link>
            <Link
              to="/breed-map"
              className={`transition-colors duration-300 ${isActive("/breed-map")
                ? "text-green-700 underline underline-offset-4 scale-105"
                : "text-gray-700 hover:text-green-600 hover:scale-105"
                }`}
            >
              Map
            </Link>
            <Link
              to="/login"
              className={`transition-colors duration-300 ${isActive("/login")
                ? "text-green-700 underline underline-offset-4 scale-105"
                : "text-gray-700 hover:text-green-600 hover:scale-105"
                }`}
            >
              User
            </Link>
          </div>
        </nav>

        <main className="px-4 md:px-8 mt-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/login" element={<Login />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/breed-map" element={<BreedMapPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;
