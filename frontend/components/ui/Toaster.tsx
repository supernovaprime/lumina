"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast: "lumina-toast",
          title: "lumina-toast-title",
          description: "lumina-toast-description",
        },
      }}
    />
  );
}
