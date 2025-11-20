import { z } from 'zod';

/**
 * Sanitizes user input to prevent XSS and injection attacks
 */
export class InputSanitizer {
  // Patterns that indicate potential attacks
  private static readonly DANGEROUS_PATTERNS = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST)\b)/gi,
    /(-{2}|\/\*|\*\/|;)/g, // SQL comments and terminators
    
    // XSS patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers like onclick=
    /<img[\s\S]*?on\w+\s*=[\s\S]*?>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    
    // Shell injection
    /[;&|`$(){}[\]<>]/g,
  ];

  /**
   * Sanitize text input by removing dangerous patterns
   */
  static sanitizeText(input: string, maxLength: number = 10000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Trim and limit length
    let sanitized = input.trim().slice(0, maxLength);

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // HTML encode special characters
    sanitized = this.htmlEncode(sanitized);

    return sanitized;
  }

  /**
   * Validate and sanitize prompt input
   */
  static sanitizePrompt(prompt: string): { sanitized: string; isValid: boolean; reason?: string } {
    if (!prompt || typeof prompt !== 'string') {
      return { sanitized: '', isValid: false, reason: 'Prompt is required' };
    }

    const trimmed = prompt.trim();

    // Check length
    if (trimmed.length < 3) {
      return { sanitized: '', isValid: false, reason: 'Prompt must be at least 3 characters' };
    }

    if (trimmed.length > 8000) {
      return { sanitized: '', isValid: false, reason: 'Prompt is too long (max 8000 characters)' };
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { 
          sanitized: '', 
          isValid: false, 
          reason: 'Prompt contains potentially harmful code. Please use descriptive text only.' 
        };
      }
    }

    // Check for excessive special characters (potential obfuscation)
    const specialCharCount = (trimmed.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
    const ratio = specialCharCount / trimmed.length;
    if (ratio > 0.3) {
      return {
        sanitized: '',
        isValid: false,
        reason: 'Prompt contains too many special characters. Please use natural language.'
      };
    }

    // Sanitize the prompt
    const sanitized = this.sanitizeText(trimmed, 8000);

    return { sanitized, isValid: true };
  }

  /**
   * HTML encode special characters to prevent XSS
   */
  private static htmlEncode(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return str.replace(/[&<>"'/]/g, (match) => htmlEntities[match]);
  }

  /**
   * Validate URL input
   */
  static sanitizeUrl(url: string): { sanitized: string; isValid: boolean; reason?: string } {
    if (!url || typeof url !== 'string') {
      return { sanitized: '', isValid: false, reason: 'URL is required' };
    }

    const trimmed = url.trim();

    // Check for javascript: or data: URLs that could execute code
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
      return {
        sanitized: '',
        isValid: false,
        reason: 'Invalid URL protocol'
      };
    }

    // Only allow http, https, or data URLs for images
    if (!/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
      return {
        sanitized: '',
        isValid: false,
        reason: 'URL must start with http://, https://, or be a data: image URL'
      };
    }

    return { sanitized: trimmed, isValid: true };
  }

  /**
   * Create a Zod schema with sanitization
   */
  static createSanitizedStringSchema(minLength: number, maxLength: number) {
    return z.string()
      .trim()
      .min(minLength, `Input must be at least ${minLength} characters`)
      .max(maxLength, `Input must be less than ${maxLength} characters`)
      .refine(
        (val) => {
          const result = this.sanitizePrompt(val);
          return result.isValid;
        },
        {
          message: 'Input contains invalid or potentially harmful content'
        }
      )
      .transform((val) => this.sanitizeText(val, maxLength));
  }
}

/**
 * Validates email format
 */
export const emailSchema = z.string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email is too long')
  .transform((val) => InputSanitizer.sanitizeText(val, 255));

/**
 * Validates and sanitizes general text input
 */
export const textSchema = (minLength: number = 1, maxLength: number = 1000) =>
  InputSanitizer.createSanitizedStringSchema(minLength, maxLength);
