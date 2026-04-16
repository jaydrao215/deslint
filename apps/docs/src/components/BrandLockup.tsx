import Image from 'next/image';
import localFont from 'next/font/local';

const satoshi = localFont({
  src: '../../public/fonts/Satoshi-Bold.woff2',
  weight: '700',
  style: 'normal',
  display: 'swap',
  variable: '--font-brand',
});

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
        <span
          className={`${satoshi.className} text-[19px] tracking-[-0.025em] lowercase`}
          aria-label="deslint"
        >
          <span className="text-gray-900">des</span>
          <span className="text-primary">lint</span>
        </span>
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
