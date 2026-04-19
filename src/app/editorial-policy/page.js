import Navbar from '@/components/layout/Navbar';

export const metadata = {
  title: 'Editorial Policy — Drishta',
  description: 'Drishta editorial standards, content moderation policy, and guidelines for channel publishers.',
};

export default function EditorialPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="news" />
      <div className="max-w-article mx-auto px-4 py-14">
        <h1 className="font-serif text-4xl font-bold text-white mb-2">Editorial Policy</h1>
        <p className="text-[#5a5a5a] text-sm mb-10">Last updated: January 2025</p>

        {[
          {
            title: '1. Purpose',
            body: `Drishta exists to improve civic accountability in India. Our editorial standards are designed
            to ensure that promises, issues, and news articles on this platform are accurate, verifiable,
            and fair. We are not a propaganda platform for any political party or ideology.`,
          },
          {
            title: '2. Promise Tracker Standards',
            body: `All promises must be sourced. Acceptable sources include: official party manifestos,
            recorded speeches with verifiable links, press releases from the politician's office,
            and credible news coverage. Promises without a source will not be approved. Promise
            status updates (Kept / Broken / In Progress) must be accompanied by evidence — a link,
            a document, or a verifiable news report. Unsubstantiated status changes will not go live.`,
          },
          {
            title: '3. Issue Board Standards',
            body: `Issues must include a photograph of the problem. The photograph must clearly show the
            reported issue. Fabricated or misleading photos will result in immediate removal and a
            ban. Issues that are political attacks masquerading as civic problems will be removed.
            Issues go live immediately but are subject to community reporting — five independent
            reports trigger an admin review.`,
          },
          {
            title: '4. News Channel Standards',
            body: `Channel publishers must: (a) identify themselves with a real name or recognised
            organisation, (b) include author bylines on all articles, (c) link claims to verifiable
            sources, (d) correct errors publicly with an editor's note — not quietly delete content,
            (e) not publish content that is designed primarily to damage the reputation of a private
            individual rather than hold a public figure accountable.`,
          },
          {
            title: '5. What We Do Not Allow',
            body: `We do not allow: defamation of private individuals, unverified criminal accusations,
            content that incites communal violence or hatred, content that constitutes electoral
            misinformation, plagiarised content, AI-generated content published as original
            reporting without disclosure, paid promotional content published as editorial, or content
            that violates any applicable Indian law.`,
          },
          {
            title: '6. Moderation',
            body: `Drishta operates a community moderation system: five independent reports on any
            piece of content (promise, issue, or article) triggers an automatic hide and admin
            review. Admins have sole discretion to restore or permanently remove content.
            Channels found to be systematically violating these policies will be suspended.`,
          },
          {
            title: '7. Corrections',
            body: `We are committed to accuracy. If you believe information on this platform is incorrect,
            use the "Report as inaccurate" feature on the relevant item, or email us at
            editorial@drishta.in. We aim to review all correction requests within 5 business days.`,
          },
          {
            title: '8. Independence',
            body: `Drishta does not accept advertising. No individual, politician, party, or company can
            pay for favourable coverage or to suppress coverage. The platform is independently
            funded. Drishta has no political alignment and covers all parties equally.`,
          },
        ].map(({ title, body }) => (
          <section key={title} className="mb-8 pb-8 border-b border-[#1a1a1a] last:border-b-0">
            <h2 className="font-serif text-lg font-semibold text-white mb-3">{title}</h2>
            <p className="text-[#8a8a8a] leading-relaxed text-[15px]">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
