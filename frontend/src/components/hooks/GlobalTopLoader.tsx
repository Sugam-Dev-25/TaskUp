import { useEffect, useState } from "react";
import { useAppSelector } from "../redux/app/hook";

export function useGlobalLoading() {
  const boardLoading = useAppSelector((s) => s.board.loading === "pending");
  const taskLoading = useAppSelector((s) => s.task.loading === "pending");
  const columnLoading = useAppSelector((s) => s.column.loading); // already a boolean in columnSlice
  const notificationLoading = useAppSelector((s) => s.notification.loading === "pending");

  return boardLoading || taskLoading || columnLoading || notificationLoading;
}

export const GlobalTopLoader = () => {
  const isLoading = useGlobalLoading();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay showing it slightly — avoids a flash on requests that resolve in <150ms
    let timeout: ReturnType<typeof setTimeout>;
    if (isLoading) {
      timeout = setTimeout(() => setVisible(true), 150);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-blue-100 overflow-hidden">
      <div className="h-full w-1/3 bg-blue-500 rounded-full animate-pulse" style={{
        animation: "globalLoaderSlide 1s ease-in-out infinite",
      }} />
      <style>{`
        @keyframes globalLoaderSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};