import { z } from 'zod';

/**
 * Sanitizes user input to prevent XSS and injection attacks
 */
export class InputSanitizer {
  // Patterns that indicate ACTUAL code injection attacks (very specific)
  private static readonly DANGEROUS_PATTERNS = [
    // XSS - actual script tags and executable code
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /javascript:\s*void\s*\(|javascript:\s*alert\s*\(|javascript:\s*eval\s*\(/gi,
    
    // Event handlers in HTML context only
    /<[^>]+on(load|error|click|mouse|key)\s*=\s*["'][^"']*["'][^>]*>/gi,
    
    // Direct code execution attempts
    /eval\s*\(\s*["'`]|Function\s*\(\s*["'`]/gi,
    
    // SQL injection - ONLY when clear SQL syntax with semicolons or unions
    /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+(TABLE|DATABASE|FROM)/gi,
    /UNION\s+SELECT|UNION\s+ALL\s+SELECT/gi,
    /--\s*$|\/\*[\s\S]*?\*\//gm, // SQL comments used in injection
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

    // Check for dangerous patterns (ONLY actual code injection)
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { 
          sanitized: '', 
          isValid: false, 
          reason: 'Prompt contains potentially harmful code injection. Please remove script tags, SQL injection syntax, or JavaScript execution attempts.' 
        };
      }
    }

    // Sanitize the prompt
    const sanitized = this.sanitizeText(trimmed, 8000);

    return { sanitized, isValid: true };
  }

  /**
   * HTML encode only when storing/displaying, not for AI prompts
   */
  private static htmlEncode(str: string): string {
    // Only encode if we detect actual HTML tags
    if (/<[^>]+>/g.test(str)) {
      const htmlEntities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
      };
      return str.replace(/[<>]/g, (match) => htmlEntities[match]);
    }
    return str;
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
