import { useEffect, useState, useRef, useCallback } from 'react';
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

const POPULAR_LANGUAGES = [
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
  // Nordic languages
  { code: 'sv', name: 'Svenska', flag: '🇸🇪', region: 'nordic' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴', region: 'nordic' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰', region: 'nordic' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮', region: 'nordic' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸', region: 'nordic' },
  // Other European
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
  // Middle East & Asia
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
];

export function LanguageTranslator() {
  const [currentLang, setCurrentLang] = useState<typeof POPULAR_LANGUAGES[0]>(POPULAR_LANGUAGES[0]);
  const translateContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLangCode = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLangCode) {
      const savedLang = POPULAR_LANGUAGES.find(l => l.code === savedLangCode);
      if (savedLang) {
        setCurrentLang(savedLang);
      }
    }
  }, []);

  // Apply translation via cookie (doesn't require Google Translate widget)
  const applyTranslation = useCallback((langCode: string) => {
    if (langCode === 'en') {
      // Reset to English - remove translation cookies
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `googtrans=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      // Reload to reset translations
      window.location.reload();
      return;
    }

    // Set cookies for Google Translate
    const cookieValue = `/en/${langCode}`;
    document.cookie = `googtrans=${cookieValue}; path=/`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
    
    // Reload to apply translation
    window.location.reload();
  }, []);

  // Initialize Google Translate script only once
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Add styles to hide Google Translate UI elements
    const style = document.createElement('style');
    style.id = 'google-translate-styles';
    style.textContent = `
      .goog-te-banner-frame,
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-te-spinner-pos,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-text-highlight,
      .skiptranslate,
      .goog-te-gadget,
      #google_translate_element {
        display: none !important;
      }
      body {
        top: 0 !important;
      }
    `;
    document.head.appendChild(style);

    // Create a container outside React's control for Google Translate
    const container = document.createElement('div');
    container.id = 'google_translate_element';
    container.style.display = 'none';
    document.body.appendChild(container);

    // Load Google Translate script
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    
    // Define init function globally
    (window as any).googleTranslateElementInit = () => {
      if ((window as any).google?.translate) {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: POPULAR_LANGUAGES.map(l => l.code).join(','),
            autoDisplay: false,
          },
          'google_translate_element'
        );
      }
    };

    document.body.appendChild(script);

    // Cleanup on unmount - but don't remove the translate elements
    // as they need to persist for translation to work
  }, []);

  const translateTo = (langCode: string) => {
    const lang = POPULAR_LANGUAGES.find(l => l.code === langCode);
    if (lang) {
      setCurrentLang(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    }
    applyTranslation(langCode);
  };

  const popularLangs = POPULAR_LANGUAGES.filter(l => l.region === 'popular');
  const nordicLangs = POPULAR_LANGUAGES.filter(l => l.region === 'nordic');
  const europeLangs = POPULAR_LANGUAGES.filter(l => l.region === 'europe');
  const asiaLangs = POPULAR_LANGUAGES.filter(l => l.region === 'asia');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto w-48 bg-popover border border-border z-50">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Popular</DropdownMenuLabel>
        {popularLangs.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => translateTo(lang.code)}
            className="gap-2 cursor-pointer"
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Nordic</DropdownMenuLabel>
        {nordicLangs.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => translateTo(lang.code)}
            className="gap-2 cursor-pointer"
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Europe</DropdownMenuLabel>
        {europeLangs.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => translateTo(lang.code)}
            className="gap-2 cursor-pointer"
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Asia & Middle East</DropdownMenuLabel>
        {asiaLangs.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => translateTo(lang.code)}
            className="gap-2 cursor-pointer"
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
