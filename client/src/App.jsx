import { Link, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import PlaceDetailPage from "./pages/PlaceDetailPage";

export default function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="logo">
          🍜 Ẩm thực Quận 6
        </Link>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/places/:id" element={<PlaceDetailPage />} />
          <Route path="*" element={<p>Không tìm thấy trang.</p>} />
        </Routes>
      </main>
    </>
  );
}