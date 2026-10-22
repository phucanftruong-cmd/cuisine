import { createContext, useContext } from "react";

export const ToastContext = createContext(() => {});

// const toast = useToast(); toast("Đã lưu"); toast("Lỗi...", "error")
export function useToast() {
  return useContext(ToastContext);
}
