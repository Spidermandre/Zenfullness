import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Screen heading. Receives focus when the screen mounts so keyboard and screen-reader
 * users land at the top of the new content after navigation.
 */
export function ScreenTitle({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={className ?? 'screen-title'}>
      {children}
    </h1>
  );
}
