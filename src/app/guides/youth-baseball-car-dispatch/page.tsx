import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Car, CheckCircle2, ClipboardList, MessageCircle, Users } from "lucide-react";
import { Footer } from "@/app/_components/Footer";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://carpool-navy.vercel.app").replace(/\/$/, "");
const pagePath = "/guides/youth-baseball-car-dispatch";
const pageUrl = `${siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "少年野球の車出し確認をラクにする方法｜LINE配車の課題と整理術",
  description:
    "少年野球チームの配車係向けに、LINEで車出し確認を集める時の手順、よくあるミス、保護者への聞き方、配車管理をラクにする方法を解説します。",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "少年野球の車出し確認をラクにする方法",
    description: "LINEで車出し確認を集める時の手順、よくあるミス、配車係の負担を減らす整理方法をまとめます。",
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
    title: "少年野球の車出し確認をラクにする方法",
    description: "少年野球チームの配車係向けに、LINEで車出し確認を集める時の課題と整理方法を解説します。",
    images: [`${siteUrl}/ogp.png`],
  },
};

const askItems = [
  "車を出せるか",
  "何人まで乗れるか",
  "兄弟や保護者も同乗するか",
  "道具や荷物を乗せられるか",
  "欠席や遅刻の可能性があるか",
];

const mistakes = [
  "「車出せます」だけ集めて、席数の確認があとになる",
  "欠席連絡が別のLINEに流れて、配車表へ反映し忘れる",
  "最新版の配車表を何度も送り直す",
  "配車係だけが頭の中で乗車割り当てを管理してしまう",
];

const templateLines = [
  "試合日：○月○日",
  "行き先：○○グラウンド",
  "集合時間：○時○分",
  "車を出せる方は、乗車可能人数も一緒に返信してください",
  "欠席・遅刻の予定があれば早めに教えてください",
];

const faqs = [
  {
    question: "少年野球の車出し確認では何を聞けばいいですか？",
    answer:
      "車を出せるか、何人まで乗れるか、兄弟や保護者の同乗、荷物の有無、欠席や遅刻の予定を確認すると、あとから配車表を作りやすくなります。",
  },
  {
    question: "LINEで車出し確認をする時の注意点は何ですか？",
    answer:
      "返信の形式がバラバラにならないよう、必要な項目を最初にそろえて聞くことです。特に席数と欠席予定は、乗車割り当てに直接影響します。",
  },
  {
    question: "車出し確認をアプリで行うメリットは何ですか？",
    answer:
      "回答形式をそろえ、車を出せる人、席数、コメントを一覧で確認しやすくなることです。LINEをさかのぼって確認する時間を減らしやすくなります。",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "少年野球の車出し確認をラクにする方法",
      description:
        "少年野球チームの配車係向けに、LINEで車出し確認を集める時の手順、よくあるミス、保護者への聞き方、配車管理をラクにする方法を解説します。",
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

export default function YouthBaseballCarDispatchGuidePage() {
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
                <CalendarCheck size={15} />
                少年野球の配車係さん向け
              </p>
              <h1 className="text-4xl font-bold leading-[1.18] tracking-normal text-gray-950 md:text-6xl md:leading-[1.12]">
                少年野球の車出し確認をラクにする方法
              </h1>
              <p className="mt-6 text-base leading-8 text-gray-600 md:text-lg">
                試合や遠征のたびに、LINEで「車を出せる方いますか？」と確認していませんか。
                車出し確認は、聞き方とまとめ方を少し整えるだけで、配車係の負担を減らしやすくなります。
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
              <GuideSection title="車出し確認で最初に聞くべきこと" icon={<MessageCircle size={22} />}>
                <p>
                  少年野球の配車では、「車を出せるか」だけでなく、何人乗れるか、兄弟や保護者も乗るか、
                  荷物を乗せられるかまで確認しておくと、あとから配車表を作りやすくなります。
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {askItems.map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-sm font-medium leading-6 text-gray-700">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-700" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </GuideSection>

              <GuideSection title="LINEで車出し確認をする時の例文" icon={<ClipboardList size={22} />}>
                <p>
                  LINEで確認する場合は、返信してほしい項目を最初に書いておくと、配車係があとから確認し直す手間を減らせます。
                </p>
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <p className="mb-3 text-sm font-bold text-gray-950">例文</p>
                  <div className="space-y-2 text-sm leading-7 text-gray-700">
                    {templateLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="車出し確認で起きやすいミス" icon={<Users size={22} />}>
                <p>
                  車出し確認は、回答を集めるところまでは簡単でも、配車表に反映する段階でミスが起きやすくなります。
                  特に席数と欠席予定は、乗車割り当てに直接影響します。
                </p>
                <div className="mt-5 space-y-3">
                  {mistakes.map((mistake) => (
                    <div key={mistake} className="flex gap-3 rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm font-medium leading-6 text-gray-700">
                      <span className="mt-2 h-2 w-2 rounded-full bg-red-400" />
                      <span>{mistake}</span>
                    </div>
                  ))}
                </div>
              </GuideSection>

              <GuideSection title="Carpoolで車出し確認を整理する" icon={<Car size={22} />}>
                <p>
                  Carpoolでは、保護者が車出し可否や乗車可能人数を回答し、配車係が一覧で確認できます。
                  LINEをさかのぼって「誰が車を出せるか」「何人乗れるか」を拾い直す時間を減らしやすくなります。
                </p>
                <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-950">登録なしでデモを確認できます</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    少年野球チームで使う前に、車出し確認、欠席確認、乗車割り当ての流れをデモで確認できます。
                  </p>
                  <Link href="/login?guest=true" className="app-button-primary mt-5 min-h-12 px-7 text-base">
                    デモを見る
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </GuideSection>

              <GuideSection title="関連記事" icon={<ClipboardList size={22} />}>
                <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                  <h2 className="text-lg font-bold text-gray-950">
                    少年サッカーの遠征配車をラクにする方法
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    試合会場への移動、集合時間、荷物、兄弟同乗など、少年サッカーの遠征配車で確認したいポイントをまとめています。
                  </p>
                  <Link href="/guides/youth-soccer-expedition-carpool" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900">
                    記事を読む
                    <ArrowRight size={16} />
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
                <li>車出し確認で聞く項目</li>
                <li>LINEで使える確認文</li>
                <li>起きやすい配車ミス</li>
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
