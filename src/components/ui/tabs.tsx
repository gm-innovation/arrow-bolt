import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

type TabsRootProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  /**
   * If provided, the active tab is persisted under this key and restored on mount.
   * Defaults to sessionStorage (per-tab), use `persist="local"` for localStorage.
   */
  storageKey?: string
  persist?: "session" | "local"
}

const STORAGE_PREFIX = "tabs:"

const getStore = (persist: "session" | "local") => {
  if (typeof window === "undefined") return null
  try {
    return persist === "local" ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsRootProps
>(({ storageKey, persist = "session", defaultValue, value, onValueChange, ...props }, ref) => {
  const isControlled = value !== undefined
  const store = storageKey ? getStore(persist) : null

  const [internal, setInternal] = React.useState<string | undefined>(() => {
    if (!storageKey || !store) return defaultValue as string | undefined
    const saved = store.getItem(STORAGE_PREFIX + storageKey)
    return saved ?? (defaultValue as string | undefined)
  })

  const handleChange = React.useCallback(
    (next: string) => {
      if (storageKey && store) {
        try { store.setItem(STORAGE_PREFIX + storageKey, next) } catch { /* ignore */ }
      }
      if (!isControlled) setInternal(next)
      onValueChange?.(next)
    },
    [storageKey, store, isControlled, onValueChange],
  )

  if (storageKey && !isControlled) {
    return (
      <TabsPrimitive.Root
        ref={ref}
        value={internal}
        onValueChange={handleChange}
        {...props}
      />
    )
  }

  return (
    <TabsPrimitive.Root
      ref={ref}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      {...props}
    />
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
