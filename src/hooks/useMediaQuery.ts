import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => undefined
    const list = window.matchMedia(query)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => (typeof window === 'undefined' || !window.matchMedia ? false : window.matchMedia(query).matches),
    () => false,
  )
}

/** Tailwind's `md` breakpoint: below this the timeline switches to a vertical layout. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
