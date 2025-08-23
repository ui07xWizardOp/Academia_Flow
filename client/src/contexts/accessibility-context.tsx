import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  skipToMain: () => void;
  enableKeyboardShortcuts: boolean;
  setEnableKeyboardShortcuts: (enabled: boolean) => void;
  currentFocus: string | null;
  setCurrentFocus: (element: string | null) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [enableKeyboardShortcuts, setEnableKeyboardShortcuts] = useState(true);
  const [currentFocus, setCurrentFocus] = useState<string | null>(null);

  // Screen reader announcement function
  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Skip to main content
  const skipToMain = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
      announceToScreenReader('Navigated to main content');
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + key combinations
      if (e.altKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            window.location.href = '/app';
            announceToScreenReader('Navigating to home');
            break;
          case 's':
            e.preventDefault();
            const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              announceToScreenReader('Search field focused');
            }
            break;
          case 'p':
            e.preventDefault();
            window.location.href = '/app/profile';
            announceToScreenReader('Navigating to profile');
            break;
          case 'a':
            e.preventDefault();
            window.location.href = '/accessibility-settings';
            announceToScreenReader('Navigating to accessibility settings');
            break;
          case 'm':
            e.preventDefault();
            skipToMain();
            break;
          case '1':
            e.preventDefault();
            window.location.href = '/app/problems';
            announceToScreenReader('Navigating to problems');
            break;
          case '2':
            e.preventDefault();
            window.location.href = '/app/interview';
            announceToScreenReader('Navigating to interviews');
            break;
          case '3':
            e.preventDefault();
            window.location.href = '/app/groups';
            announceToScreenReader('Navigating to study groups');
            break;
        }
      }

      // Escape key to close dialogs
      if (e.key === 'Escape') {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const closeButton = dialog.querySelector('[data-dialog-close]') as HTMLButtonElement;
          if (closeButton) {
            closeButton.click();
            announceToScreenReader('Dialog closed');
          }
        }
      }

      // F6 to cycle through landmarks
      if (e.key === 'F6') {
        e.preventDefault();
        const landmarks = document.querySelectorAll('nav, main, aside, header, footer');
        const currentIndex = Array.from(landmarks).findIndex(el => el.contains(document.activeElement));
        const nextIndex = (currentIndex + 1) % landmarks.length;
        const nextLandmark = landmarks[nextIndex] as HTMLElement;
        nextLandmark.focus();
        const landmarkType = nextLandmark.tagName.toLowerCase();
        announceToScreenReader(`Navigated to ${landmarkType} section`);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts]);

  // Focus management
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.id) {
        setCurrentFocus(target.id);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        announceToScreenReader,
        skipToMain,
        enableKeyboardShortcuts,
        setEnableKeyboardShortcuts,
        currentFocus,
        setCurrentFocus,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}