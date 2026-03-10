import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Users, User, Shield, UsersRound } from 'lucide-react';

export interface MentionItem {
  type: 'role' | 'user' | 'group';
  value: string;
  displayName: string;
}

const ROLE_OPTIONS: MentionItem[] = [
  { type: 'role', value: 'technician', displayName: 'Técnicos' },
  { type: 'role', value: 'coordinator', displayName: 'Coordenadores' },
  { type: 'role', value: 'hr', displayName: 'RH' },
  { type: 'role', value: 'manager', displayName: 'Gerentes' },
  { type: 'role', value: 'commercial', displayName: 'Comercial' },
  { type: 'role', value: 'qualidade', displayName: 'Qualidade' },
  { type: 'role', value: 'compras', displayName: 'Suprimentos' },
  { type: 'role', value: 'financeiro', displayName: 'Financeiro' },
  { type: 'role', value: 'super_admin', displayName: 'Super Admin' },
];

type FilterTab = 'all' | 'people' | 'roles' | 'groups';

const TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Todos', icon: Users },
  { key: 'people', label: 'Pessoas', icon: User },
  { key: 'roles', label: 'Funções', icon: Shield },
  { key: 'groups', label: 'Grupos', icon: UsersRound },
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursorMentionStart, setCursorMentionStart] = useState<number | null>(null);
  const [userResults, setUserResults] = useState<MentionItem[]>([]);
  const [groupResults, setGroupResults] = useState<MentionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef.current) return;
    const rect = textareaRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 340;
    const openBelow = spaceBelow >= dropdownHeight;
    setDropdownPos({
      top: openBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  // Fetch users when search changes
  useEffect(() => {
    if (!showDropdown || !user) return;
    const fetchResults = async () => {
      let usersQuery = supabase.from('profiles').select('id, full_name').limit(8);
      if (debouncedSearch.length > 0) {
        usersQuery = usersQuery.ilike('full_name', `%${debouncedSearch}%`);
      }
      const { data: usersData } = await usersQuery;
      setUserResults(
        (usersData || []).map((p) => ({
          type: 'user' as const,
          value: p.id,
          displayName: p.full_name || 'Sem nome',
        }))
      );
      let groupsQuery = supabase.from('corp_groups').select('id, name').limit(6);
      if (debouncedSearch.length > 0) {
        groupsQuery = groupsQuery.ilike('name', `%${debouncedSearch}%`);
      }
      const { data: groupsData } = await groupsQuery;
      setGroupResults(
        (groupsData || []).map((g) => ({
          type: 'group' as const,
          value: g.id,
          displayName: g.name,
        }))
      );
    };
    fetchResults();
  }, [debouncedSearch, showDropdown, user]);

  const filteredRoles = ROLE_OPTIONS.filter((r) =>
    r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFilteredOptions = (): MentionItem[] => {
    switch (activeTab) {
      case 'people': return userResults;
      case 'roles': return filteredRoles;
      case 'groups': return groupResults;
      default: return [...filteredRoles, ...groupResults, ...userResults];
    }
  };

  const allOptions = getFilteredOptions();

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeTab]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (textareaRef.current?.contains(target)) return;
      // Check if click is inside the portal dropdown
      const portalEl = document.getElementById('mention-dropdown-portal');
      if (portalEl?.contains(target)) return;
      setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const insertMention = useCallback((item: MentionItem) => {
    if (cursorMentionStart === null) return;
    const before = value.slice(0, cursorMentionStart);
    const after = value.slice(textareaRef.current?.selectionStart || cursorMentionStart);
    const mentionText = `@${item.displayName} `;
    const newValue = before + mentionText + after;
    onChange(newValue);

    if (!mentions.some((m) => m.type === item.type && m.value === item.value)) {
      onMentionsChange([...mentions, item]);
    }

    setShowDropdown(false);
    setCursorMentionStart(null);
    setSearchQuery('');

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
    const textBefore = newValue.slice(0, pos);
    const atMatch = textBefore.match(/(^|\s)@(\S*)$/);

    if (atMatch) {
      setCursorMentionStart(textBefore.lastIndexOf('@'));
      setSearchQuery(atMatch[2]);
      setShowDropdown(true);
      setActiveTab('all');
    } else {
      setShowDropdown(false);
      setCursorMentionStart(null);
      setSearchQuery('');
    }
  };

  const removeMention = (index: number) => {
    const m = mentions[index];
    const mentionText = `@${m.displayName}`;
    const newValue = value.replace(mentionText, '').replace(/\s{2,}/g, ' ').trim();
    onChange(newValue);
    onMentionsChange(mentions.filter((_, i) => i !== index));
  };

  const getItemIcon = (item: MentionItem) => {
    if (item.type === 'user') {
      const initials = item.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      return (
        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0">
          {initials}
        </span>
      );
    }
    if (item.type === 'role') {
      return (
        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0">
          <Shield className="h-4 w-4 text-primary" />
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0">
        <UsersRound className="h-4 w-4 text-primary" />
      </span>
    );
  };

  const getTypeLabel = (type: MentionItem['type']) => {
    switch (type) {
      case 'role': return 'Função';
      case 'group': return 'Grupo';
      case 'user': return 'Pessoa';
    }
  };

  const dropdown = showDropdown && allOptions.length > 0 && dropdownPos && createPortal(
    <div
      id="mention-dropdown-portal"
      className="fixed z-[9999] rounded-xl border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: Math.max(dropdownPos.width, 320),
      }}
    >
      {/* Filter Tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b border-border/60">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === 'all'
            ? filteredRoles.length + groupResults.length + userResults.length
            : tab.key === 'people' ? userResults.length
            : tab.key === 'roles' ? filteredRoles.length
            : groupResults.length;
          return (
            <button
              key={tab.key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setActiveTab(tab.key); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] min-w-[16px] text-center rounded-full px-1',
                  activeTab === tab.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results List */}
      <div className="max-h-[260px] overflow-y-auto p-1.5">
        {allOptions.map((item, idx) => (
          <button
            key={`${item.type}-${item.value}`}
            type="button"
            className={cn(
              'flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors',
              selectedIndex === idx
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
            onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            {getItemIcon(item)}
            <div className="flex flex-col items-start min-w-0">
              <span className={cn(
                'font-medium truncate',
                selectedIndex === idx ? 'text-primary-foreground' : 'text-foreground'
              )}>
                {item.displayName}
              </span>
              <span className={cn(
                'text-[11px]',
                selectedIndex === idx ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {getTypeLabel(item.type)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-border/60 flex items-center gap-2 text-[10px] text-muted-foreground">
        <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">↑↓</kbd>
        navegar
        <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">↵</kbd>
        selecionar
        <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">esc</kbd>
        fechar
      </div>
    </div>,
    document.body
  );

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
                m.type === 'role' || m.type === 'group'
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-accent text-accent-foreground hover:bg-accent/80'
              )}
              onClick={() => removeMention(i)}
              title="Clique para remover"
            >
              {m.type === 'role' || m.type === 'group' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              @{m.displayName}
              <span className="text-[10px] opacity-60">✕</span>
            </span>
          ))}
        </div>
      )}

      {dropdown}
    </div>
  );
};

export default FeedMentionInput;
