import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const LANGUAGE_STORAGE_KEY = 'vinci-language-preference';
const RELOAD_GUARD_KEY = 'vinci-gt-reload-once';

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
  // Inject once
  if (document.getElementById('google-translate-script')) return;

  // styles (hide UI, keep translation behavior)
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

  // container
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
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
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
  const [currentLang, setCurrentLang] = useState<Lang>(LANGUAGES[0]);
  const lastPathRef = useRef(location.pathname);

  const grouped = useMemo(() => {
    return {
      popular: LANGUAGES.filter(l => l.region === 'popular'),
      nordic: LANGUAGES.filter(l => l.region === 'nordic'),
      europe: LANGUAGES.filter(l => l.region === 'europe'),
      asia: LANGUAGES.filter(l => l.region === 'asia'),
    };
  }, []);

  // Init script once
  useEffect(() => {
    ensureTranslateScriptLoaded();
  }, []);

  // Restore preference + ensure cookie
  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    const lang = (LANGUAGES as readonly Lang[]).find(l => l.code === saved) || LANGUAGES[0];
    setCurrentLang(lang);
    setGoogTransCookie(lang.code);
  }, []);

  // SPA navigation: Google Translate won't re-translate new DOM reliably.
  // So we perform a single hard reload per route (guarded), preserving auth session.
  useEffect(() => {
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;

    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    if (saved === 'en') return;

    // ensure cookie is present for the new page load
    setGoogTransCookie(saved);

    const guard = getReloadGuard();
    const key = `${saved}:${location.pathname}`;
    if (guard[key]) return;
    guard[key] = true;
    setReloadGuard(guard);

    // slight delay to allow route update to settle
    const t = setTimeout(() => window.location.reload(), 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const translateTo = (langCode: string) => {
    const lang = (LANGUAGES as readonly Lang[]).find(l => l.code === langCode) || LANGUAGES[0];
    setCurrentLang(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);

    // clear reload guard so next pages can reload once under the new language
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
