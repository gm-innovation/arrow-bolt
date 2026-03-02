import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Users, User } from 'lucide-react';

export interface MentionItem {
  type: 'role' | 'user';
  value: string;
  displayName: string;
}

const ROLE_OPTIONS: MentionItem[] = [
  { type: 'role', value: 'technician', displayName: 'Técnicos' },
  { type: 'role', value: 'admin', displayName: 'Administradores' },
  { type: 'role', value: 'hr', displayName: 'RH' },
  { type: 'role', value: 'manager', displayName: 'Gerentes' },
  { type: 'role', value: 'commercial', displayName: 'Comercial' },
  { type: 'role', value: 'qualidade', displayName: 'Qualidade' },
  { type: 'role', value: 'compras', displayName: 'Suprimentos' },
  { type: 'role', value: 'financeiro', displayName: 'Financeiro' },
  { type: 'role', value: 'super_admin', displayName: 'Super Admin' },
];

interface FeedMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  mentions: MentionItem[];
  onMentionsChange: (mentions: MentionItem[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onFocus?: () => void;
}

const FeedMentionInput = ({
  value,
  onChange,
  mentions,
  onMentionsChange,
  placeholder,
  rows = 1,
  className,
  onFocus,
}: FeedMentionInputProps) => {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursorMentionStart, setCursorMentionStart] = useState<number | null>(null);
  const [userResults, setUserResults] = useState<MentionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch users when search changes
  useEffect(() => {
    if (!showDropdown || !user) return;
    const fetchUsers = async () => {
      if (debouncedSearch.length < 1) {
        setUserResults([]);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${debouncedSearch}%`)
        .limit(8);
      setUserResults(
        (data || []).map((p) => ({
          type: 'user' as const,
          value: p.id,
          displayName: p.full_name || 'Sem nome',
        }))
      );
    };
    fetchUsers();
  }, [debouncedSearch, showDropdown, user]);

  const filteredRoles = ROLE_OPTIONS.filter((r) =>
    r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allOptions = [...filteredRoles, ...userResults];

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const insertMention = useCallback((item: MentionItem) => {
    if (cursorMentionStart === null) return;
    const before = value.slice(0, cursorMentionStart);
    const after = value.slice(textareaRef.current?.selectionStart || cursorMentionStart);
    const mentionText = `@${item.displayName} `;
    const newValue = before + mentionText + after;
    onChange(newValue);

    // Add to mentions if not already there
    if (!mentions.some((m) => m.type === item.type && m.value === item.value)) {
      onMentionsChange([...mentions, item]);
    }

    setShowDropdown(false);
    setCursorMentionStart(null);
    setSearchQuery('');

    // Focus back and set cursor
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = before.length + mentionText.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [cursorMentionStart, value, onChange, mentions, onMentionsChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || allOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % allOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + allOptions.length) % allOptions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (allOptions[selectedIndex]) {
        e.preventDefault();
        insertMention(allOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const pos = e.target.selectionStart;
    // Check if we're typing after an @
    const textBefore = newValue.slice(0, pos);
    const atMatch = textBefore.match(/(^|\s)@(\S*)$/);

    if (atMatch) {
      setCursorMentionStart(textBefore.lastIndexOf('@'));
      setSearchQuery(atMatch[2]);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setCursorMentionStart(null);
      setSearchQuery('');
    }
  };

  const removeMention = (index: number) => {
    const m = mentions[index];
    const mentionText = `@${m.displayName}`;
    // Remove from text
    const newValue = value.replace(mentionText, '').replace(/\s{2,}/g, ' ').trim();
    onChange(newValue);
    onMentionsChange(mentions.filter((_, i) => i !== index));
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-0 transition-all',
          className
        )}
      />

      {/* Mention tags */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {mentions.map((m, i) => (
            <span
              key={`${m.type}-${m.value}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors',
                m.type === 'role'
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-accent text-accent-foreground hover:bg-accent/80'
              )}
              onClick={() => removeMention(i)}
              title="Clique para remover"
            >
              {m.type === 'role' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              @{m.displayName}
              <span className="text-[10px] opacity-60">✕</span>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && allOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {filteredRoles.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grupos</p>
              {filteredRoles.map((r, i) => (
                <button
                  key={r.value}
                  type="button"
                  className={cn(
                    'flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors',
                    selectedIndex === i ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  )}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(r); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {r.displayName}
                </button>
              ))}
            </>
          )}
          {userResults.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Pessoas</p>
              {userResults.map((u, idx) => {
                const globalIdx = filteredRoles.length + idx;
                return (
                  <button
                    key={u.value}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors',
                      selectedIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {u.displayName}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedMentionInput;
