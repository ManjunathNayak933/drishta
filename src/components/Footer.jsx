import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1a1a1a] bg-[#080808] mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">

          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#3a3a3a] mb-3">Drishta</p>
            <p className="text-[12px] text-[#4a4a4a] leading-relaxed">
              A civic accountability platform for India. A mirror. A glass.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#3a3a3a] mb-3">Explore</p>
            <div className="space-y-2">
              {[
                { href: '/', label: 'Constituencies' },
                { href: '/promises', label: 'Promises' },
                { href: '/issues', label: 'Issues' },
                { href: '/news', label: 'News' },
                { href: '/india', label: 'Central Government' },
                { href: '/compare', label: 'Compare Politicians' },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="block text-[12px] text-[#5a5a5a] hover:text-[#9a9a9a] transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#3a3a3a] mb-3">Contribute</p>
            <div className="space-y-2">
              {[
                { href: '/submit/promise', label: 'Submit a Promise' },
                { href: '/submit/issue', label: 'Report an Issue' },
                { href: '/channel/apply', label: 'Become a Publisher' },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="block text-[12px] text-[#5a5a5a] hover:text-[#9a9a9a] transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#3a3a3a] mb-3">Legal</p>
            <div className="space-y-2">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/policy', label: 'Policy & Disclaimer' },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="block text-[12px] text-[#5a5a5a] hover:text-[#9a9a9a] transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#1a1a1a] pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-[#3a3a3a]">© {year} Drishta. All rights reserved.</p>
          <p className="text-[11px] text-[#2a2a2a] text-center">
            Data is sourced from public records. Always verify independently.
          </p>
        </div>
      </div>
    </footer>
  );
}
