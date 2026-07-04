import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Car, CheckCircle2, ClipboardList, MapPin, MessageCircle, Users } from "lucide-react";
import { Footer } from "@/app/_components/Footer";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://carpool-navy.vercel.app").replace(/\/$/, "");
const pagePath = "/guides/youth-soccer-expedition-carpool";
const pageUrl = `${siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "少年サッカーの遠征配車をラクにする方法｜車出し確認と乗車割り当て",
  description:
    "少年サッカーチームの配車係向けに、遠征や試合会場への車出し確認、集合時間、荷物、乗車割り当てをLINEでまとめる時の課題と整理方法を解説します。",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "少年サッカーの遠征配車をラクにする方法",
    description:
      "少年サッカーの試合・遠征で、車出し確認や乗車割り当てをLINEでまとめる時の注意点と整理方法をまとめます。",
    url: pageUrl,
    siteName: "Carpool",
    images: [
      {
        url: `${siteUrl}/ogp.png`,
        width: 1200,
        height: 630,
        alt: "Carpool - 少年野球・サッカーの配車管理アプリ",
      },
    ],
    locale: "ja_JP",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "少年サッカーの遠征配車をラクにする方法",
    description: "少年サッカーチームの配車係向けに、遠征配車で確認したい項目と整理方法を解説します。",
    images: [`${siteUrl}/ogp.png`],
  },
};

const checkItems = [
  "試合会場と集合場所",
  "集合時間と出発時間",
  "車を出せる保護者",
  "車ごとの乗車可能人数",
  "道具や荷物を乗せられるか",
  "兄弟や保護者の同乗予定",
];

const soccerProblems = [
  "会場が毎回変わり、集合場所や出発時間の確認が増える",
  "荷物や道具が多く、空き席だけでは配車を決めにくい",
  "兄弟同乗や保護者同乗で人数が変わりやすい",
  "欠席や遅刻の連絡で、乗車割り当てを作り直すことがある",
];

const lineTemplate = [
  "試合日：○月○日",
  "会場：○○グラウンド",
  "集合場所：○○小学校",
  "出発時間：○時○分",
  "車を出せる方は、乗車可能人数と荷物の可否を返信してください",
  "兄弟・保護者の同乗、欠席予定があれば一緒に教えてください",
];

const faqs = [
  {
    question: "少年サッカーの遠征配車では何を確認すればいいですか？",
    answer:
      "試合会場、集合場所、出発時間、車を出せる保護者、乗車可能人数、荷物の有無、兄弟や保護者の同乗、欠席予定を確認すると配車を組みやすくなります。",
  },
  {
    question: "サッカーの配車が大変になりやすい理由は何ですか？",
    answer:
      "会場が変わりやすいこと、荷物が多いこと、兄弟や保護者の同乗で人数が変わりやすいこと、欠席や遅刻で割り当てが変わることが理由です。",
  },
  {
    question: "遠征配車をアプリで管理するメリットは何ですか？",
    answer:
      "車出し可否、席数、コメント、乗車割り当てを見える形にできることです。配車係がLINEをさかのぼって確認する時間を減らしやすくなります。",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "少年サッカーの遠征配車をラクにする方法",
      description:
        "少年サッカーチームの配車係向けに、遠征や試合会場への車出し確認、集合時間、荷物、乗車割り当てをLINEでまとめる時の課題と整理方法を解説します。",
      inLanguage: "ja",
      mainEntityOfPage: pageUrl,
      publisher: {
        "@type": "Organization",
        name: "Carpool",
        url: siteUrl,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@type": "SoftwareApplication",
      name: "Carpool",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description: "少年野球・サッカーなどスポーツチーム向けの配車管理アプリです。",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
    },
  ],
};

export default function YouthSoccerExpeditionCarpoolGuidePage() {
  return (
    <div className="min-h-screen bg-[#f5f8f4] text-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main>
        <section className="relative overflow-hidden px-4 py-6 md:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(15,118,110,0.12),transparent_28rem),linear-gradient(135deg,#f8fbf7_0%,#edf5ef_58%,#f7f4ed_100%)]" />
          <div className="relative mx-auto max-w-5xl">
            <nav className="mb-10 flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-3 shadow-[0_18px_60px_rgba(15,51,46,0.09)] ring-1 ring-gray-950/[0.02] backdrop-blur md:px-5">
              <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-gray-950">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-gradient-to-br from-[#0f766e] via-[#246f68] to-[#183f3c] text-white shadow-[0_10px_26px_rgba(20,83,75,0.24)] ring-1 ring-teal-900/10">
                  <Car size={20} strokeWidth={2.35} />
                </span>
                <span className="bg-gradient-to-br from-[#153f3b] to-[#2b7a70] bg-clip-text text-transparent">
                  Carpool
                </span>
              </Link>
              <Link href="/login?guest=true" className="app-button-secondary min-h-10 px-3 text-sm md:min-h-11 md:px-5">
                デモを見る
              </Link>
            </nav>

            <div className="max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/90 px-3 py-1 text-sm font-semibold text-teal-800 shadow-sm">
                <MapPin size={15} />
                少年サッカーの配車係さん向け
              </p>
              <h1 className="text-4xl font-bold leading-[1.18] tracking-normal text-gray-950 md:text-6xl md:leading-[1.12]">
                少年サッカーの遠征配車をラクにする方法
              </h1>
              <p className="mt-6 text-base leading-8 text-gray-600 md:text-lg">
                少年サッカーの試合や遠征では、会場・集合時間・荷物・兄弟同乗など、確認することが多くなりがちです。
                LINEで車出し確認をする時に、配車係の負担を減らす整理方法をまとめます。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login?guest=true" className="app-button-primary min-h-12 px-7 text-base">
                  登録なしでデモを見る
                  <ArrowRight size={18} />
                </Link>
                <Link href="/guides/line-carpool-management" className="app-button-secondary min-h-12 border-gray-200 bg-white/90 px-7 text-base shadow-sm">
                  配車管理ガイドを見る
                </Link>
              </div>
            </div>
          </div>
        </section>

        <article className="px-4 pb-16">
          <div className="app-container grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="space-y-6">
              <GuideSection title="遠征配車で最初に確認したいこと" icon={<CalendarCheck size={22} />}>
                <p>
                  少年サッカーの遠征配車では、車を出せるかだけでなく、会場、集合場所、出発時間、荷物、
                  兄弟や保護者の同乗まで確認しておくと、配車表を作る時に迷いにくくなります。
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {checkItems.map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-sm font-medium leading-6 text-gray-700">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-700" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </GuideSection>

              <GuideSection title="LINEで遠征配車を確認する時の例文" icon={<MessageCircle size={22} />}>
                <p>
                  LINEで確認する場合は、返信してほしい項目を最初にそろえておくと、あとから「何人乗れるか」「荷物は乗るか」を聞き直す手間を減らせます。
                </p>
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <p className="mb-3 text-sm font-bold text-gray-950">例文</p>
                  <div className="space-y-2 text-sm leading-7 text-gray-700">
                    {lineTemplate.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="少年サッカーの配車が大変になりやすい理由" icon={<Users size={22} />}>
                <p>
                  サッカーの遠征配車は、会場や荷物、兄弟同乗などの条件が重なりやすいため、LINEの返信だけでは配車の完成形が見えにくくなることがあります。
                </p>
                <div className="mt-5 space-y-3">
                  {soccerProblems.map((problem) => (
                    <div key={problem} className="flex gap-3 rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm font-medium leading-6 text-gray-700">
                      <span className="mt-2 h-2 w-2 rounded-full bg-red-400" />
                      <span>{problem}</span>
                    </div>
                  ))}
                </div>
              </GuideSection>

              <GuideSection title="Carpoolで遠征配車を整理する" icon={<Car size={22} />}>
                <p>
                  Carpoolでは、保護者の車出し可否、席数、コメントをまとめて確認し、車ごとに誰が乗るかを整理できます。
                  配車係がLINEをさかのぼって確認する時間を減らし、変更後も見直しやすくすることを目指しています。
                </p>
                <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-950">登録なしでデモを確認できます</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    チームで使う前に、車出し確認、欠席確認、乗車割り当ての流れをデモで確認できます。
                  </p>
                  <Link href="/login?guest=true" className="app-button-primary mt-5 min-h-12 px-7 text-base">
                    デモを見る
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </GuideSection>

              <GuideSection title="よくある質問" icon={<ClipboardList size={22} />}>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <section key={faq.question} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                      <h2 className="font-bold text-gray-950">{faq.question}</h2>
                      <p className="mt-2 text-sm leading-7 text-gray-600">{faq.answer}</p>
                    </section>
                  ))}
                </div>
              </GuideSection>
            </div>

            <aside className="app-card sticky top-6 hidden p-5 lg:block">
              <p className="text-sm font-semibold text-teal-700">この記事で分かること</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                <li>遠征配車で確認する項目</li>
                <li>LINEで使える確認文</li>
                <li>少年サッカー特有の配車課題</li>
                <li>Carpoolのデモ導線</li>
              </ul>
            </aside>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

function GuideSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card p-5 md:p-7">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          {icon}
        </span>
        <h2 className="text-2xl font-bold leading-snug text-gray-950">{title}</h2>
      </div>
      <div className="text-base leading-8 text-gray-600">{children}</div>
    </section>
  );
}
