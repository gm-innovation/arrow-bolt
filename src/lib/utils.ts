import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a date string (YYYY-MM-DD) without timezone issues.
 * Adds T00:00:00 to interpret as local time instead of UTC.
 */
export function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  // If already has time component, parse directly
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  
  // Add T00:00:00 to interpret as local time
  return new Date(dateString + 'T00:00:00');
}

/**
 * Format a date string (YYYY-MM-DD) to Brazilian format (dd/MM/yyyy)
 * without timezone issues.
 */
export function formatLocalDate(
  dateString: string | null | undefined, 
  formatString: string = 'dd/MM/yyyy'
): string {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '-';
  return format(date, formatString, { locale: ptBR });
}

/**
 * Sanitizes a file name for use in Supabase Storage paths.
 * Removes accented characters, replaces spaces with underscores,
 * and removes other special characters that cause "Invalid key" errors.
 */
export function sanitizeFileName(fileName: string): string {
  // Normalize to decompose accented characters, then remove diacritics
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace spaces with underscores and remove invalid characters
  const sanitized = normalized
    .replace(/\s+/g, '_')              // Spaces to underscores
    .replace(/[^a-zA-Z0-9_.\-]/g, '')  // Remove special characters except _ . -
    .replace(/__+/g, '_');             // Remove duplicate underscores
  
  return sanitized;
}
