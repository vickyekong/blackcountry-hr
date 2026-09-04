"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type DashboardViewContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const DashboardViewContext = createContext<DashboardViewContextValue | null>(
  null
);

export function DashboardViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, toggle, close }),
    [open, toggle, close]
  );

  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView() {
  const ctx = useContext(DashboardViewContext);
  if (!ctx) {
    throw new Error("useDashboardView must be used inside DashboardViewProvider");
  }
  return ctx;
}
