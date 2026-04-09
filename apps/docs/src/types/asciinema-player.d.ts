declare module 'asciinema-player' {
  interface CreateOptions {
    autoPlay?: boolean;
    loop?: boolean;
    speed?: number;
    theme?: string;
    rows?: number;
    cols?: number;
    idleTimeLimit?: number;
    poster?: string;
    controls?: boolean | 'auto';
    fit?: 'width' | 'height' | 'both' | 'none' | false;
    startAt?: number | string;
    preload?: boolean;
    title?: string;
    author?: string;
    authorURL?: string;
    authorImgURL?: string;
  }

  interface Player {
    el: HTMLElement;
    dispose: () => void;
    getCurrentTime: () => Promise<number>;
    getDuration: () => Promise<number>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seek: (pos: number | string) => Promise<void>;
    addEventListener: (name: string, callback: (...args: unknown[]) => void) => void;
  }

  export function create(
    src: string | { url: string },
    elem: HTMLElement,
    opts?: CreateOptions,
  ): Player;
}

declare module 'asciinema-player/dist/bundle/asciinema-player.css';
