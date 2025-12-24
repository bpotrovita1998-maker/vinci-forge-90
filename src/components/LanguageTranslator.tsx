import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const LANGUAGE_STORAGE_KEY = 'vinci-language-preference';
const RELOAD_GUARD_KEY = 'vinci-gt-reload-once';
const PREFERENCE_KEY = 'preferred_language';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', region: 'popular' },
  { code: 'es', name: 'Español', flag: '🇪🇸', region: 'popular' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', region: 'popular' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', region: 'popular' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', region: 'popular' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', region: 'popular' },
  { code: 'ro', name: 'Română', flag: '🇷🇴', region: 'popular' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', region: 'popular' },
  { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳', region: 'popular' },
  { code: 'zh-TW', name: '中文 (繁體)', flag: '🇹🇼', region: 'popular' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', region: 'popular' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', region: 'popular' },
  // Nordic
  { code: 'sv', name: 'Svenska', flag: '🇸🇪', region: 'nordic' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴', region: 'nordic' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰', region: 'nordic' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮', region: 'nordic' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸', region: 'nordic' },
  // Europe
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', region: 'europe' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', region: 'europe' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿', region: 'europe' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰', region: 'europe' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺', region: 'europe' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷', region: 'europe' },
  { code: 'bg', name: 'Български', flag: '🇧🇬', region: 'europe' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', region: 'europe' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷', region: 'europe' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸', region: 'europe' },
  // Asia & Middle East
  { code: 'ar', name: 'العربية', flag: '🇸🇦', region: 'asia' },
  { code: 'he', name: 'עברית', flag: '🇮🇱', region: 'asia' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', region: 'asia' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', region: 'asia' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', region: 'asia' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', region: 'asia' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', region: 'asia' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', region: 'asia' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭', region: 'asia' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', region: 'asia' },
] as const;

type Lang = (typeof LANGUAGES)[number];

function setGoogTransCookie(langCode: string) {
  const hostname = window.location.hostname;

  if (langCode === 'en') {
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `googtrans=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return;
  }

  const cookieValue = `/en/${langCode}`;
  document.cookie = `googtrans=${cookieValue}; path=/`;
  document.cookie = `googtrans=${cookieValue}; path=/; domain=${hostname}`;
}

function ensureTranslateScriptLoaded() {
  if (document.getElementById('google-translate-script')) return;

  if (!document.getElementById('google-translate-styles')) {
    const style = document.createElement('style');
    style.id = 'google-translate-styles';
    style.textContent = `
      .goog-te-banner-frame { display: none !important; }
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-te-spinner-pos,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-text-highlight,
      .goog-te-gadget,
      #google_translate_element {
        display: none !important;
      }
      body { top: 0 !important; }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('google_translate_element')) {
    const container = document.createElement('div');
    container.id = 'google_translate_element';
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  (window as any).googleTranslateElementInit = () => {
    if ((window as any).google?.translate && (window as any).google.translate.TranslateElement) {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map(l => l.code).join(','),
          autoDisplay: false,
        },
        'google_translate_element'
      );
    }
  };

  const script = document.createElement('script');
  script.id = 'google-translate-script';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  script.onload = () => {
    (window as any).__vinciGoogleTranslateLoaded = true;
  };
  script.onerror = () => {
    (window as any).__vinciGoogleTranslateLoaded = false;
    // Most common causes: AdBlock/privacy extensions, network filtering, or restrictive CSP.
    toast.error('Translator blocked', {
      description:
        'Your browser or a network rule blocked translate.google.com. Disable AdBlock/privacy extensions for this site, then hard refresh (Ctrl+Shift+R).',
      duration: 10000,
    });
  };
  document.body.appendChild(script);
}

function getReloadGuard(): Record<string, true> {
  try {
    return JSON.parse(sessionStorage.getItem(RELOAD_GUARD_KEY) || '{}');
  } catch {
    return {};
  }
}

function setReloadGuard(next: Record<string, true>) {
  sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify(next));
}

export function LanguageTranslator() {
  const location = useLocation();
  const { user } = useAuth();
  const [currentLang, setCurrentLang] = useState<Lang>(LANGUAGES[0]);
  const lastPathRef = useRef(location.pathname);
  const hasFetchedFromDb = useRef(false);

  const grouped = useMemo(() => {
    return {
      popular: LANGUAGES.filter(l => l.region === 'popular'),
      nordic: LANGUAGES.filter(l => l.region === 'nordic'),
      europe: LANGUAGES.filter(l => l.region === 'europe'),
      asia: LANGUAGES.filter(l => l.region === 'asia'),
    };
  }, []);

  useEffect(() => {
    ensureTranslateScriptLoaded();

    const t = setTimeout(() => {
      const wanted = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
      const loaded = !!(window as any).google?.translate;
      const flaggedLoaded = (window as any).__vinciGoogleTranslateLoaded;

      if (wanted !== 'en' && (!loaded || flaggedLoaded === false)) {
        toast.warning('Translator not active', {
          description:
            'Nothing is translating because Google Translate is not loading. Check AdBlock/privacy extensions, Brave shields, or network filtering; then hard refresh (Ctrl+Shift+R).',
          duration: 10000,
        });
      }
    }, 2500);

    return () => clearTimeout(t);
  }, []);

  // Load preference from DB (if logged in) or localStorage
  useEffect(() => {
    const loadPreference = async () => {
      let langCode = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';

      // If user is logged in, try to get from database
      if (user && !hasFetchedFromDb.current) {
        hasFetchedFromDb.current = true;

        const { data } = await supabase
          .from('user_preferences')
          .select('preference_value')
          .eq('user_id', user.id)
          .eq('preference_key', PREFERENCE_KEY)
          .maybeSingle();

        if (data?.preference_value) {
          const dbLangCode = (data.preference_value as { code?: string })?.code;
          if (dbLangCode) {
            langCode = dbLangCode;
            // Sync to localStorage
            localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
          }
        } else {
          // No DB preference yet, save current localStorage value to DB
          const currentLocal = localStorage.getItem(LANGUAGE_STORAGE_KEY);
          if (currentLocal && currentLocal !== 'en') {
            await supabase.from('user_preferences').upsert(
              {
                user_id: user.id,
                preference_key: PREFERENCE_KEY,
                preference_type: 'language',
                preference_value: { code: currentLocal },
              },
              {
                onConflict: 'user_id,preference_key',
              }
            );
          }
        }
      }

      const lang = (LANGUAGES as readonly Lang[]).find(l => l.code === langCode) || LANGUAGES[0];
      setCurrentLang(lang);
      setGoogTransCookie(lang.code);

      // If a non-English language is saved, we need ONE initial reload so Google Translate
      // can apply it (it reads the cookie during initialization).
      if (lang.code !== 'en') {
        const guard = getReloadGuard();
        const key = `init:${lang.code}`;
        if (!guard[key]) {
          guard[key] = true;
          setReloadGuard(guard);
          setTimeout(() => window.location.reload(), 50);
        }
      }
    };

    loadPreference();
  }, [user]);

  // SPA navigation: reload once per route to apply translation
  useEffect(() => {
    lastPathRef.current = location.pathname;

    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    if (saved === 'en') return;

    setGoogTransCookie(saved);

    const guard = getReloadGuard();
    const key = `${saved}:${location.pathname}`;
    if (guard[key]) return;
    guard[key] = true;
    setReloadGuard(guard);

    const t = setTimeout(() => window.location.reload(), 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const translateTo = async (langCode: string) => {
    const lang = (LANGUAGES as readonly Lang[]).find(l => l.code === langCode) || LANGUAGES[0];
    setCurrentLang(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);

    // Save to database if logged in
    if (user) {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        preference_key: PREFERENCE_KEY,
        preference_type: 'language',
        preference_value: { code: lang.code },
      }, {
        onConflict: 'user_id,preference_key',
      });
    }

    sessionStorage.removeItem(RELOAD_GUARD_KEY);
    setGoogTransCookie(lang.code);
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground notranslate"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto w-48 bg-popover border border-border z-50 notranslate">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Popular</DropdownMenuLabel>
        {grouped.popular.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => translateTo(lang.code)} className="gap-2 cursor-pointer">
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Nordic</DropdownMenuLabel>
        {grouped.nordic.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => translateTo(lang.code)} className="gap-2 cursor-pointer">
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Europe</DropdownMenuLabel>
        {grouped.europe.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => translateTo(lang.code)} className="gap-2 cursor-pointer">
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Asia & Middle East</DropdownMenuLabel>
        {grouped.asia.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => translateTo(lang.code)} className="gap-2 cursor-pointer">
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
