import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Login from "./pages/Login";
import BreedMapPage from "./pages/BreedMap";
import ExplorePage from "./pages/Explore";

function App() {
  const location = useLocation(); // get current route

  // Function to check if a nav link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div
        className="pb-30 bg-gradient-to-b from-green-100 to-white"
      >
        <nav className="flex justify-between p-5 items-baseline gap-4">
          <Link
            to="/"
            className={`text-xl font-semibold ${isActive("/") ? "text-green-700 underline" : ""
              }`}
          >
            Cattle Scan
          </Link>
          <div className="flex gap-6">
            <Link
              to="/scan"
              className={isActive("/scan") ? "text-green-700 underline" : ""}
            >
              Scan
            </Link>
            <Link
              to="/explore"
              className={isActive("/explore") ? "text-green-700 underline" : ""}
            >
              Explore
            </Link>
            <Link
              to="/breed-map"
              className={isActive("/breed-map") ? "text-green-700 underline" : ""}
            >
              Breed Map
            </Link>
            <Link
              to="/login"
              className={isActive("/login") ? "text-green-700 underline" : ""}
            >
              User
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/login" element={<Login />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/breed-map" element={<BreedMapPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
