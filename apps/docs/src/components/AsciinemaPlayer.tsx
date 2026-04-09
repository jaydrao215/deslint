'use client';

import { useEffect, useRef } from 'react';

/**
 * Thin React wrapper around the real `asciinema-player` npm package.
 *
 * Marketing discipline: this plays an ACTUAL recording of the Deslint MCP
 * server responding to a JSON-RPC client — same terminal session a developer
 * would see on their own machine. It's deliberately paired with the
 * hand-animated `McpFlowMockup` on the landing page so viewers get both the
 * polished marketing animation AND the raw proof that the server works.
 *
 * We call `create()` imperatively inside an effect because asciinema-player
 * touches the DOM directly and has no React binding of its own. The dispose
 * call on cleanup is critical — otherwise hot-reload leaks duplicate players.
 */
interface AsciinemaPlayerProps {
  src: string;
  rows?: number;
  cols?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  theme?: string;
  idleTimeLimit?: number;
  poster?: string;
  className?: string;
}

export function AsciinemaPlayer({
  src,
  rows = 38,
  cols = 82,
  autoPlay = true,
  loop = true,
  speed = 1.15,
  theme = 'asciinema',
  idleTimeLimit = 1.2,
  poster = 'npt:0:02',
  className = '',
}: AsciinemaPlayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let disposed = false;
    let player: { dispose: () => void } | null = null;

    // Dynamic import keeps asciinema-player out of the initial bundle. The
    // player is a ~40kB dependency that only the MCP section needs.
    import('asciinema-player').then((mod) => {
      if (disposed || !ref.current) return;
      player = mod.create(src, ref.current, {
        autoPlay,
        loop,
        speed,
        theme,
        rows,
        cols,
        idleTimeLimit,
        poster,
        controls: true,
        fit: 'width',
      });
    });

    return () => {
      disposed = true;
      if (player) player.dispose();
    };
  }, [src, rows, cols, autoPlay, loop, speed, theme, idleTimeLimit, poster]);

  return <div ref={ref} className={className} />;
}
