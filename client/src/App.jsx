import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { useI18n } from "./i18n/useI18n";
import AudioProvider from "./audio/AudioProvider";
import MiniPlayer from "./audio/MiniPlayer";
import SiteFooter from "./components/layout/SiteFooter";
import SiteHeader from "./components/layout/SiteHeader";
import ExplorePage from "./pages/ExplorePage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import NotFoundPage from "./pages/NotFoundPage";
import PlaceDetailPage from "./pages/PlaceDetailPage";
import "./styles/public.css";

// Trang quản trị tách thành gói riêng: khách không phải tải mã và CSS của admin
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminPlacesPage = lazy(() => import("./pages/admin/AdminPlacesPage"));
const PlaceFormPage = lazy(() => import("./pages/admin/PlaceFormPage"));
const AdminGate = lazy(() => import("./pages/admin/AdminGate"));

const admin = (page) => <AdminGate>{page}</AdminGate>;

export default function App() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  // Trang quản trị có khung riêng (thanh bên), không dùng header của trang khách
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  // Chuyển trang thì cuộn lên đầu
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const routes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/places/:id" element={<PlaceDetailPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={admin(<AdminDashboardPage />)} />
      <Route path="/admin/places" element={admin(<AdminPlacesPage />)} />
      <Route path="/admin/places/new" element={admin(<PlaceFormPage />)} />
      <Route path="/admin/places/:id/edit" element={admin(<PlaceFormPage />)} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  if (isAdminArea) return <Suspense fallback={null}>{routes}</Suspense>;

  // Trang khách: AudioProvider bọc cả layout để nghe tiếp khi chuyển trang
  const isMap = pathname === "/map";
  return (
    <AudioProvider>
      <div className={isMap ? "site site--map" : "site"}>
        <a href="#main" className="tv-skip">
          {t("nav.skip")}
        </a>
        <SiteHeader />
        <main id="main" className="tv-main">
          {routes}
        </main>
        {!isMap && <SiteFooter />}
        <MiniPlayer />
      </div>
    </AudioProvider>
  );
}
