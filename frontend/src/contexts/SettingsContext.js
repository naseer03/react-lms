import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsService } from '../services/settings.service';
import { applyPrimaryColor } from '../utils/colorUtils';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await settingsService.get();
      const s = res.data?.data?.settings;
      if (s) {
        setSettings(s);
        // Apply brand color to CSS variables so every primary-* Tailwind class updates
        if (s.primaryColor) applyPrimaryColor(s.primaryColor);
      }
    } catch {
      // Settings endpoint may require auth; silently fail — defaults stay in :root
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
};
