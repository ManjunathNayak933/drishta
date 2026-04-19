'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar({ active, onReport }) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/promises', label: 'Promises' },
    { href: '/issues',   label: 'Issues' },
    { href: '/news',     label: 'News' },
    { href: '/compare',  label: 'Compare' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-content mx-auto px-4 h-12 flex items-center justify-between">

          <Link href="/" className="font-serif font-bold text-white text-lg tracking-tight hover:text-[#e0e0e0] transition-colors flex-shrink-0">
            Drishta
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                  active === label.toLowerCase() ? 'text-white bg-[#1a1a1a]' : 'text-[#6a6a6a] hover:text-[#c0c0c0]'
                }`}>
                {label}
              </Link>
            ))}
          </div>

          {/* Always visible on both mobile and desktop */}
          <div className="flex items-center gap-2">
            {onReport ? (
              <button onClick={onReport}
                className="flex items-center gap-1.5 text-[11px] text-[#f59e0b] hover:text-[#fbbf24] border border-[#f59e0b]/30 hover:border-[#f59e0b]/60 px-2.5 py-1.5 rounded transition-colors">
                ⚑ <span className="hidden sm:inline">Report Data Issue</span><span className="sm:hidden">Report</span>
              </button>
            ) : (
              <Link href="/report-issue"
                className="flex items-center gap-1.5 text-[11px] text-[#f59e0b] hover:text-[#fbbf24] border border-[#f59e0b]/30 hover:border-[#f59e0b]/60 px-2.5 py-1.5 rounded transition-colors">
                ⚑ <span className="hidden sm:inline">Report Data Issue</span><span className="sm:hidden">Report</span>
              </Link>
            )}

            <button onClick={() => setOpen(o => !o)}
              className="flex md:hidden w-9 h-9 flex-col items-center justify-center gap-1.5 text-[#6a6a6a] hover:text-white transition-colors"
              aria-label="Toggle menu">
              <span className={`block w-5 h-px bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block w-5 h-px bg-current transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-px bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-30 pt-12" onClick={() => setOpen(false)}>
          <div className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3" onClick={e => e.stopPropagation()}>
            {links.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`flex items-center h-11 text-[15px] border-b border-[#1a1a1a] last:border-b-0 transition-colors ${
                  active === label.toLowerCase() ? 'text-white font-medium' : 'text-[#8a8a8a] hover:text-white'
                }`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
