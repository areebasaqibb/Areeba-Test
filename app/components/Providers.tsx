"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { ReactNode, useEffect, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          boxShadow: '0 4px 15px rgba(244, 114, 182, 0.15)',
        }
      }} />
    </NextThemesProvider>
  );
}
