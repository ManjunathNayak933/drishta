export const metadata = { title: 'About Us' };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-2xl mx-auto px-4 py-16">

        <h1 className="font-serif text-4xl font-black text-white mb-2">About Drishta</h1>
        <p className="text-[#5a5a5a] text-sm mb-12 italic font-serif">A mirror. A glass.</p>

        <div className="space-y-8 text-[#8a8a8a] leading-relaxed text-[14px]">

          <section>
            <h2 className="text-white font-serif text-xl font-bold mb-3">What is Drishta?</h2>
            <p>
              Drishta is a civic accountability platform built for India. The name means
              "seer" or "witness" in Sanskrit - one who sees clearly. We exist to make the
              relationship between elected representatives and their constituents transparent,
              traceable, and honest.
            </p>
          </section>

          <section>
            <h2 className="text-white font-serif text-xl font-bold mb-3">What we do</h2>
            <p className="mb-3">
              We track promises made by Members of Parliament and Members of Legislative
              Assemblies across India from election manifestos, public speeches, and
              official statements. We record whether those promises were kept, broken,
              or remain in progress.
            </p>
            <p className="mb-3">
              We provide a space for citizens to report local issues, hold their
              representatives accountable, and access independent journalism from
              verified local news channels.
            </p>
            <p>
              We also track constituency history who represented each area, from
              which party, across every election since the constituency was formed.
            </p>
          </section>

          <section>
            <h2 className="text-white font-serif text-xl font-bold mb-3">Who built this?</h2>
            <p>
              Drishta is an independent civic technology project. It is not affiliated
              with any political party, government body, or commercial interest. We have
              no advertisers and accept no political funding. Our goal is simple
              give every Indian citizen the information they need to hold their
              representatives accountable.
            </p>
          </section>

          <section>
            <h2 className="text-white font-serif text-xl font-bold mb-3">Our data</h2>
            <p className="mb-3">
              Data on Drishta is sourced from publicly available records the Election
              Commission of India, MyNeta/ADR affidavit data, official government portals,
              Wikipedia, and news archives. We do our best to keep it accurate and current,
              but we are a small team and errors can occur.
            </p>
            <p>
              If you find something wrong, use the Report Data Issue button on any
              constituency page. We take all reports seriously.
            </p>
          </section>

          <section>
            <h2 className="text-white font-serif text-xl font-bold mb-3">Contact</h2>
            <p>
              For corrections, partnerships, or publisher applications, use the contact
              options within the platform. For news publishers, apply through our{' '}
              <a href="/channel/apply" className="text-[#3b82f6] hover:underline">
                publisher programme
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-[#1a1a1a]">
          <a href="/policy" className="text-[12px] text-[#4a4a4a] hover:text-[#8a8a8a] transition-colors">
            Read our Policy & Disclaimer →
          </a>
        </div>

      </div>
    </div>
  );
}
