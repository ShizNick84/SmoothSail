'use client';

import { useEffect } from 'react';

/**
 * Theme script component to prevent flash of unstyled content (FOUC)
 * This should be included in the document head to apply theme before hydration
 */
export function ThemeScript() {
  useEffect(() => {
    // This script runs before React hydration to prevent theme flash
    const script = `
      (function() {
        try {
          var theme = localStorage.getItem('ai-trader-theme');
          var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          var effectiveTheme = theme === 'system' || !theme ? systemTheme : theme;
          
          if (effectiveTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          
          // Add smooth transition class after initial load
          setTimeout(function() {
            document.documentElement.classList.add('theme-transition');
          }, 100);
        } catch (e) {
          console.warn('Theme script error:', e);
        }
      })();
    `;

    // Only run on client side
    if (typeof window !== 'undefined') {
      const scriptElement = document.createElement('script');
      scriptElement.innerHTML = script;
      document.head.appendChild(scriptElement);

      return () => {
        document.head.removeChild(scriptElement);
      };
    }
  }, []);

  return null;
}

/**
 * Inline script string for server-side rendering
 * Use this in your document head for SSR applications
 */
export const themeScriptContent = `
(function() {
  try {
    var theme = localStorage.getItem('ai-trader-theme');
    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var effectiveTheme = theme === 'system' || !theme ? systemTheme : theme;
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Add smooth transition class after initial load
    setTimeout(function() {
      document.documentElement.classList.add('theme-transition');
    }, 100);
  } catch (e) {
    console.warn('Theme script error:', e);
  }
})();
`;