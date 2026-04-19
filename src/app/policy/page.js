export const metadata = { title: 'Policy & Disclaimer' };

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-white font-serif text-xl font-bold mb-4 pb-2 border-b border-[#1a1a1a]">
      {title}
    </h2>
    <div className="space-y-3 text-[#8a8a8a] leading-relaxed text-[14px]">
      {children}
    </div>
  </section>
);

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-2xl mx-auto px-4 py-16">

        <h1 className="font-serif text-4xl font-black text-white mb-2">Policy & Disclaimer</h1>
        <p className="text-[#4a4a4a] text-sm mb-2">Last updated: April 2026</p>
        <p className="text-[#5a5a5a] text-[13px] mb-12 leading-relaxed">
          Please read this page carefully. By using Drishta, you agree to the terms
          described below.
        </p>

        <Section title="1. Data Accuracy Disclaimer">
          <p>
            Drishta aggregates information from publicly available sources including the
            Election Commission of India, government portals, Wikipedia, news archives,
            and official affidavit data. While we make every effort to ensure accuracy,
            we cannot guarantee that all information on this platform is current, complete,
            or error-free.
          </p>
          <p>
            There is often a gap between when real-world events occur and when that
            information is entered into our database. Constituency representatives may
            change due to by-elections, party switches, disqualifications, or other
            events that we may not have captured yet. Budget figures, promise statuses,
            and performance data reflect our best understanding at the time of entry
            and may not reflect the latest ground reality.
          </p>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-[#c0c0c0] text-[13px] font-medium mb-1">Important notice</p>
            <p className="text-[#7a7a7a] text-[13px]">
              Always verify information independently before using it for legal, electoral,
              journalistic, or other consequential purposes. Drishta is a reference tool,
              not an authoritative legal record. The Election Commission of India and
              official government portals remain the authoritative sources for all
              electoral and administrative data.
            </p>
          </div>
          <p>
            If you find incorrect or outdated information, please use the
            "Report Data Issue" feature on any constituency page. We take all reports
            seriously and aim to correct errors as quickly as possible.
          </p>
        </Section>

        <Section title="2. News & Articles Disclaimer">
          <p>
            News articles and reports published on Drishta are contributed by independent
            news channels and publishers who have applied for and been approved through
            our publisher programme. These articles represent the views and reporting
            of the respective publishers, not those of Drishta.
          </p>
          <p>
            Articles published on Drishta are <strong className="text-[#c0c0c0]">not independently
            verified by Drishta</strong> for factual accuracy before publication. We rely on
            our publishers to maintain journalistic standards and to ensure their reporting
            is accurate, fair, and lawful.
          </p>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-[#c0c0c0] text-[13px] font-medium mb-1">If you believe an article is factually incorrect</p>
            <p className="text-[#7a7a7a] text-[13px]">
              Use the report button on any article page. We will review the report and,
              where warranted, contact the publisher or remove the article. We apologise
              in advance for any inaccurate content that appears on this platform. Our
              goal is to provide a space for credible local journalism, and we take
              misinformation seriously.
            </p>
          </div>
          <p>
            Drishta reserves the right to remove any article that is found to be
            factually incorrect, defamatory, misleading, or in violation of applicable
            law, at our sole discretion and without prior notice to the publisher.
          </p>
        </Section>

        <Section title="3. Publisher Liability">
          <p>
            Publishers on Drishta are independent third parties who operate their own
            news channels. They are solely responsible for the content they publish,
            including its accuracy, legality, and compliance with applicable laws
            including but not limited to Indian defamation law, the Information
            Technology Act 2000, and the Press Council of India guidelines.
          </p>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-[#c0c0c0] text-[13px] font-medium mb-2">Drishta is not legally liable for</p>
            <ul className="text-[#7a7a7a] text-[13px] space-y-1.5">
              <li>• Any claims, damages, or losses arising from articles published by third-party publishers on this platform</li>
              <li>• The accuracy, completeness, or timeliness of publisher content</li>
              <li>• Any defamatory, false, or misleading statements made by publishers</li>
              <li>• Copyright infringement or intellectual property violations by publishers</li>
              <li>• Any legal disputes arising from the content of published articles</li>
            </ul>
          </div>
          <p>
            By publishing on Drishta, publishers agree to indemnify and hold Drishta
            harmless from any claims, legal proceedings, or liabilities arising from
            their published content. Publishers retain full responsibility for their
            articles and any consequences arising from them.
          </p>
          <p>
            Drishta acts as an intermediary platform in good faith. We do not edit,
            curate, or endorse the specific content of individual publisher articles
            beyond verifying that the publisher meets our eligibility criteria at the
            time of onboarding.
          </p>
        </Section>

        <Section title="4. Political Neutrality">
          <p>
            Drishta is a non-partisan platform. We track promises and performance for
            politicians across all parties without favour. We do not endorse any
            political party, candidate, or ideology. The data on promise status
            (Kept, Broken, In Progress, etc.) is based on publicly verifiable evidence
            reviewed by our team and is subject to the same data accuracy caveats
            described above.
          </p>
          <p>
            If you believe a promise status has been unfairly categorised, use the
            report feature or contact us. We are committed to being fair to all
            representatives regardless of party affiliation.
          </p>
        </Section>

        <Section title="5. User-Submitted Content">
          <p>
            Citizens can submit promises, issues, and data reports on Drishta. All
            user-submitted content is reviewed by our admin team before being published.
            By submitting content, you confirm that it is accurate to the best of your
            knowledge and that you have the right to share it. Drishta reserves the
            right to reject or remove any user submission at our discretion.
          </p>
        </Section>

        <Section title="6. Changes to This Policy">
          <p>
            We may update this policy from time to time. The date at the top of this
            page reflects the most recent revision. Continued use of Drishta after
            any changes constitutes your acceptance of the updated policy.
          </p>
        </Section>

        <div className="mt-8 pt-6 border-t border-[#1a1a1a]">
          <a href="/about" className="text-[12px] text-[#4a4a4a] hover:text-[#8a8a8a] transition-colors">
            ← Back to About Us
          </a>
        </div>

      </div>
    </div>
  );
}
