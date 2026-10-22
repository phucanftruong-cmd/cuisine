import "../../admin.css";
import RequireAdmin from "../../auth/RequireAdmin";
import ToastProvider from "./ToastProvider";

// Cổng vào khu quản trị: chỉ tải (cùng admin.css) khi khách mở /admin
export default function AdminGate({ children }) {
  return (
    <RequireAdmin>
      <ToastProvider>{children}</ToastProvider>
    </RequireAdmin>
  );
}
