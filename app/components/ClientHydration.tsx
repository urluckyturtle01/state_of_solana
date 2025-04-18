"use client";

import { useEffect } from "react";

export default function ClientHydration() {
  useEffect(() => {
    // Remove any extra classes that might cause hydration mismatch
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains("hydrated")) {
      htmlElement.classList.remove("hydrated");
    }
  }, []);

  return null;
} 