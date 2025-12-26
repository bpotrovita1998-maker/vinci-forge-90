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

// NOTE: We intentionally avoid forcing the googtrans cookie globally.
// Setting it can auto-trigger translation and, when React re-renders, Google’s DOM mutations
// can cause "removeChild" crashes. We rely on the widget's combo switch instead.

function ensureTranslateScriptLoaded() {
  // Always ensure styles + container + init exist, even if the script tag was added earlier.

  if (!document.getElementById('google-translate-styles')) {
    const style = document.createElement('style');
    style.id = 'google-translate-styles';
    style.textContent = `
      /* Hide the Google Translate top banner + tooltips (but DO NOT hide .skiptranslate) */
      .goog-te-banner-frame,
      .goog-te-menu-frame,
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-te-spinner-pos,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-text-highlight {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
      }

      /* Keep the widget in the DOM (so the hidden language combo exists), but visually hide it */
      #google_translate_element {
        position: fixed !important;
        left: -9999px !important;
        top: 0 !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }

      /* Prevent body from being pushed down by the (hidden) banner */
      body {
        top: 0 !important;
        position: static !important;
      }

      /* Hide the iframe toolbar Google injects */
      iframe.goog-te-banner-frame,
      iframe.skiptranslate {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('google_translate_element')) {
    const container = document.createElement('div');
    container.id = 'google_translate_element';
    // Keep it renderable for Google (so it injects the <select>), but offscreen/invisible.
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
  }

  (window as any).googleTranslateElementInit = () => {
    if ((window as any).google?.translate && (window as any).google.translate.TranslateElement) {
      // Avoid re-creating the widget if it already injected the combo.
      if (document.querySelector('select.goog-te-combo')) return;

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

  // If the script is already present, just try to init the widget.
  if (document.getElementById('google-translate-script')) {
    try {
      (window as any).googleTranslateElementInit?.();
    } catch {
      // ignore
    }
    return;
  }

  const script = document.createElement('script');
  script.id = 'google-translate-script';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  script.onload = () => {
    (window as any).__vinciGoogleTranslateLoaded = true;
    try {
      (window as any).googleTranslateElementInit?.();
    } catch {
      // ignore
    }
  };
  script.onerror = () => {
    (window as any).__vinciGoogleTranslateLoaded = false;
    toast.error('Translator blocked', {
      description:
        'Your browser or a network rule blocked translate.google.com. Disable AdBlock/privacy extensions for this site, then hard refresh (Ctrl+Shift+R).',
      duration: 10000,
    });
  };
  document.body.appendChild(script);
}

function getTranslateCombo(): HTMLSelectElement | null {
  return document.querySelector('select.goog-te-combo') as HTMLSelectElement | null;
}

function tryApplyTranslateViaCombo(langCode: string): boolean {
  const combo = getTranslateCombo();
  if (!combo) return false;

  // Set value
  combo.value = langCode;
  
  // Dispatch multiple event types to ensure Google picks it up
  const events = ['change', 'input', 'blur'];
  events.forEach(type => {
    combo.dispatchEvent(new Event(type, { bubbles: true }));
  });

  // Also try triggering via the native setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(combo, langCode);
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return true;
}

// Fallback: set googtrans cookie and reload (only when user explicitly picks a language)
function applyTranslateViaCookie(langCode: string) {
  const domain = window.location.hostname;
  const path = '/';
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  
  if (langCode === 'en') {
    // Clear the cookie to reset to English
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${domain}`;
  } else {
    const value = `/en/${langCode}`;
    document.cookie = `googtrans=${value}; expires=${expires}; path=${path}`;
    document.cookie = `googtrans=${value}; expires=${expires}; path=${path}; domain=${domain}`;
    document.cookie = `googtrans=${value}; expires=${expires}; path=${path}; domain=.${domain}`;
  }
}

async function applyGoogleTranslate(langCode: string, opts?: { timeoutMs?: number; useCookieFallback?: boolean }) {
  const timeoutMs = opts?.timeoutMs ?? 3000;
  const useCookieFallback = opts?.useCookieFallback ?? true;
  const start = Date.now();

  ensureTranslateScriptLoaded();

  // Wait for combo to appear
  while (Date.now() - start < timeoutMs) {
    const combo = getTranslateCombo();
    if (combo) {
      const applied = tryApplyTranslateViaCombo(langCode);
      if (applied) {
        console.log('[Translator] Applied via combo:', langCode);
        return true;
      }
    }
    await new Promise(r => setTimeout(r, 150));
  }

  // If combo never appeared, use cookie fallback + reload
  if (useCookieFallback && langCode !== 'en') {
    console.log('[Translator] Combo not found, using cookie fallback for:', langCode);
    applyTranslateViaCookie(langCode);
    // Mark that we're doing a translation reload so we don't loop
    if (!sessionStorage.getItem('vinci-gt-reload-once')) {
      sessionStorage.setItem('vinci-gt-reload-once', 'true');
      window.location.reload();
    }
    return true;
  }

  return false;
}

// (kept for backward-compat with older sessions) – no longer used
const RELOAD_GUARD_KEY = 'vinci-gt-reload-once';
function hasReloadedThisSession(): boolean {
  return sessionStorage.getItem(RELOAD_GUARD_KEY) === 'true';
}
function markReloadDone() {
  sessionStorage.setItem(RELOAD_GUARD_KEY, 'true');
}
async function guardedReload() {
  if (hasReloadedThisSession()) return;
  markReloadDone();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  window.location.reload();
}

export function LanguageTranslator() {
  const location = useLocation();
  const { user } = useAuth();
  const [currentLang, setCurrentLang] = useState<Lang>(LANGUAGES[0]);
  const [isReady, setIsReady] = useState(false);
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

  // Mark component as ready after initial mount - prevents reload during hydration
  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(t);
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
    // Don't do anything until the component is ready
    if (!isReady) return;

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
      
      // DO NOT auto-apply non-English languages on page load.
      // This prevents the "page goes blank after 3 sec" issue.
      // Translation only happens when user explicitly picks language from dropdown.
    };

    loadPreference();
  }, [user, isReady]);

  const translateTo = async (langCode: string) => {
    const lang = (LANGUAGES as readonly Lang[]).find(l => l.code === langCode) || LANGUAGES[0];
    setCurrentLang(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);

    // Save to database if logged in (avoid upsert-onConflict 400s by doing select->update/insert)
    if (user) {
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('preference_key', PREFERENCE_KEY)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('user_preferences')
          .update({
            preference_type: 'language',
            preference_value: { code: lang.code },
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_preferences').insert({
          user_id: user.id,
          preference_key: PREFERENCE_KEY,
          preference_type: 'language',
          preference_value: { code: lang.code },
        });
      }
    }

    // Clear the reload guard so cookie fallback can work if needed
    sessionStorage.removeItem('vinci-gt-reload-once');
    
    // Apply translation - will use combo first, then cookie fallback with reload if needed
    if (lang.code !== 'en') {
      const applied = await applyGoogleTranslate(lang.code, { useCookieFallback: true });
      if (!applied) {
        toast.error('Translation not ready', {
          description: 'Google Translate widget did not initialize. Disable AdBlock/privacy shields for translate.google.com and refresh.',
          duration: 8000,
        });
      }
    } else {
      // Reset to English - clear cookie and apply
      applyTranslateViaCookie('en');
      await applyGoogleTranslate('en', { useCookieFallback: false });
    }
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
