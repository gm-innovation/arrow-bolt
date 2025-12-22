import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
