import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CreatedCuriouslyCreditProps {
  className?: string;
}

export function CreatedCuriouslyCredit({ className }: CreatedCuriouslyCreditProps) {
  return (
    <p
      className={cn(
        'text-center text-[10px] leading-none text-[#efefef] transition-colors',
        className,
      )}
    >
      <Link
        href="https://www.tanishparsana.com"
        target="_blank"
        rel="noreferrer"
        className="hover:text-[#e3e3e3]"
      >
        Created Curiously by Tanish Parsana.
      </Link>
    </p>
  );
}
