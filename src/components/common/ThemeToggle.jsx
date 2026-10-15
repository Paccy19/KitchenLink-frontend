import React from 'react';
import { Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext';

/**
 * Light/dark switch for the customer and vendor areas. Styled with the same
 * stone/brand utilities as the rest of the chrome so it themes itself.
 */
export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={clsx(
        'relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-[#faf6f2] hover:text-[#542813] transition active:scale-95',
        className,
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
