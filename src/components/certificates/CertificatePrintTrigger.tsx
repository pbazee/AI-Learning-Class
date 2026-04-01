"use client";

import { useEffect } from "react";

export function CertificatePrintTrigger({ shouldPrint }: { shouldPrint: boolean }) {
  useEffect(() => {
    if (!shouldPrint) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [shouldPrint]);

  return null;
}
