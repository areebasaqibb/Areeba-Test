'use client';

import { useEffect } from 'react';

export default function BrandThemeProvider({ activeTheme }: { activeTheme: any }) {
  useEffect(() => {
    const applyTheme = () => {
      let styleEl = document.getElementById('ai-brand-theme-style');
      
      if (!activeTheme) {
        if (styleEl) styleEl.remove();
        return;
      }

      try {
        const lightVars = typeof activeTheme.lightMode === 'string' ? JSON.parse(activeTheme.lightMode) : activeTheme.lightMode;
        const darkVars = typeof activeTheme.darkMode === 'string' ? JSON.parse(activeTheme.darkMode) : activeTheme.darkMode;
        
        let cssString = ':root {\n';
        Object.entries(lightVars || {}).forEach(([k, v]) => {
          if (v) cssString += `  ${k}: ${v};\n`;
        });
        cssString += '}\n\n';
        
        cssString += '.dark {\n';
        Object.entries(darkVars || {}).forEach(([k, v]) => {
          if (v) cssString += `  ${k}: ${v};\n`;
        });
        cssString += '}\n';

        // Add transition rules to make theme switching smooth
        cssString += `
          * {
            transition: background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                        border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        fill 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        stroke 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `;

        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'ai-brand-theme-style';
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = cssString;

      } catch (e) {
        console.error('Error applying AI brand theme', e);
      }
    };

    applyTheme();
  }, [activeTheme]);

  return null;
}
