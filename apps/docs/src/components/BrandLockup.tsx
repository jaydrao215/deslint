import Image from 'next/image';

interface BrandLockupProps {
  size?: 'nav' | 'footer';
  showTagline?: boolean;
  taglineClassName?: string;
  priority?: boolean;
}

export function BrandLockup({
  size = 'nav',
  showTagline = false,
  taglineClassName = '',
  priority = false,
}: BrandLockupProps) {
  const iconSize = size === 'footer' ? 36 : 32;
  const wordmarkClass =
    size === 'footer'
      ? 'text-lg font-semibold tracking-tight text-gray-900'
      : 'text-lg font-semibold tracking-tight text-gray-900';

  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/icons/icon-32.svg"
        alt=""
        role="presentation"
        width={iconSize}
        height={iconSize}
        priority={priority}
        className={size === 'footer' ? 'h-9 w-9' : 'h-8 w-8'}
      />
      <span className="flex flex-col leading-none">
        <span className={wordmarkClass}>Deslint</span>
        {showTagline && (
          <span
            className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 ${taglineClassName}`}
          >
            Design Quality Gate
          </span>
        )}
      </span>
    </span>
  );
}
