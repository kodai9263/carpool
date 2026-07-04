import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2, ClipboardList, MessageCircle, Users } from "lucide-react";
import { Footer } from "@/app/_components/Footer";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://carpool-navy.vercel.app").replace(/\/$/, "");
const pagePath = "/guides/line-carpool-management";
const pageUrl = `${siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "少年野球・サッカーの配車をLINEで管理する時の課題と解決策｜Carpool",
  description:
    "少年野球・サッカーなどスポーツチームの配車係向けに、LINEでの車出し確認、乗車割り当て、配車表共有で起きやすい課題と解決策をまとめます。",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "少年野球・サッカーの配車をLINEで管理する時の課題と解決策",
    description:
      "LINEで車出し確認や乗車割り当てをまとめる時に起きやすい課題と、配車係の負担を減らす方法を解説します。",
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
    title: "少年野球・サッカーの配車をLINEで管理する時の課題と解決策",
    description: "スポーツチームの配車係向けに、LINE管理で起きやすい課題と解決策をまとめます。",
    images: [`${siteUrl}/ogp.png`],
  },
};

const problems = [
  "車を出せる人の返信がLINEの中に流れてしまう",
  "何人乗れるか、兄弟や保護者の同乗があとから分かる",
  "欠席や変更が出るたびに配車表を直す必要がある",
  "最新版の配車表がどれか分かりにくくなる",
];

const steps = [
  "試合や遠征の日程、集合場所、目的地を決める",
  "LINEで車を出せる保護者を確認する",
  "車ごとの空き席と参加する子どもを整理する",
  "誰がどの車に乗るかを割り当てる",
  "配車表や当日の確認事項をチームへ共有する",
];

const solutions = [
  {
    title: "車出し確認をそろった形で集める",
    desc: "車を出せるか、何人乗れるか、コメントがあるかを同じ形式で集めると、あとから読み返す手間を減らせます。",
  },
  {
    title: "乗車割り当てを車ごとに見える化する",
    desc: "ドライバーごとに乗る子どもを整理しておくと、誰がどの車に乗るかを配車係も保護者も確認しやすくなります。",
  },
  {
    title: "最新版を共有しやすい状態にする",
    desc: "欠席や変更が出た時に、配車係だけが頭の中で管理するのではなく、確認しやすい場所にまとめておくことが大切です。",
  },
];

const faqs = [
  {
    question: "LINEだけで配車管理をしても問題ありませんか？",
    answer:
      "少人数のチームや車出しが少ない日はLINEだけでも管理できます。ただし、人数が増えたり欠席・変更が多いチームでは、返信の見落としや配車表の作り直しが起きやすくなります。",
  },
  {
    question: "配車係は何をまとめる必要がありますか？",
    answer:
      "主に、車を出せる保護者、車ごとの席数、参加する子ども、欠席者、誰がどの車に乗るか、当日の集合場所や時間をまとめます。",
  },
  {
    question: "配車管理アプリを使うメリットは何ですか？",
    answer:
      "回答の形式をそろえ、車ごとの空き席や乗車割り当てを見える形にできることです。配車係がLINEをさかのぼって確認する時間を減らしやすくなります。",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "少年野球・サッカーの配車をLINEで管理する時の課題と解決策",
      description:
        "少年野球・サッカーなどスポーツチームの配車係向けに、LINEでの車出し確認、乗車割り当て、配車表共有で起きやすい課題と解決策をまとめます。",
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

export default function LineCarpoolManagementGuidePage() {
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
                <ClipboardList size={15} />
                配車係さん向けガイド
              </p>
              <h1 className="text-4xl font-bold leading-[1.18] tracking-normal text-gray-950 md:text-6xl md:leading-[1.12]">
                少年野球・サッカーの配車をLINEで管理する時の課題と解決策
              </h1>
              <p className="mt-6 text-base leading-8 text-gray-600 md:text-lg">
                試合や遠征のたびに、LINEで車出し確認や乗車割り当てをまとめていませんか。
                この記事では、スポーツチームの配車係がつまずきやすいポイントと、負担を減らすための整理方法をまとめます。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login?guest=true" className="app-button-primary min-h-12 px-7 text-base">
                  登録なしでデモを見る
                  <ArrowRight size={18} />
                </Link>
                <Link href="/" className="app-button-secondary min-h-12 border-gray-200 bg-white/90 px-7 text-base shadow-sm">
                  LPに戻る
                </Link>
              </div>
            </div>
          </div>
        </section>

        <article className="px-4 pb-16">
          <div className="app-container grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="space-y-6">
              <GuideSection title="配車係がLINEで管理する時の基本的な流れ" icon={<MessageCircle size={22} />}>
                <p>
                  LINEで配車をまとめる場合、流れ自体はシンプルです。ただし、実際には返信の形式がそろわなかったり、
                  欠席や変更があとから届いたりするため、最後に配車係が整理し直す作業が発生しやすくなります。
                </p>
                <ol className="mt-5 space-y-3">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-sm leading-6 text-gray-700">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </GuideSection>

              <GuideSection title="LINEだけで配車管理をすると起きやすい課題" icon={<Users size={22} />}>
                <p>
                  LINEは連絡には便利ですが、配車表を作るための情報管理には向いていない場面があります。
                  特に、車を出せる人、乗れる人数、欠席者、乗車割り当てが同じトーク内に流れると、最新版を確認しにくくなります。
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {problems.map((problem) => (
                    <div key={problem} className="flex gap-3 rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm font-medium leading-6 text-gray-700">
                      <span className="mt-2 h-2 w-2 rounded-full bg-red-400" />
                      <span>{problem}</span>
                    </div>
                  ))}
                </div>
              </GuideSection>

              <GuideSection title="配車係の負担を減らすための整理方法" icon={<CheckCircle2 size={22} />}>
                <p>
                  大切なのは、配車係だけが頭の中で管理しないことです。車出し確認、席数、欠席、乗車割り当てを
                  見える形にしておくと、変更が出た時も確認し直しやすくなります。
                </p>
                <div className="mt-5 space-y-4">
                  {solutions.map((solution) => (
                    <div key={solution.title} className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                      <h2 className="text-lg font-bold text-gray-950">{solution.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-gray-600">{solution.desc}</p>
                    </div>
                  ))}
                </div>
              </GuideSection>

              <GuideSection title="Carpoolでできること" icon={<Car size={22} />}>
                <p>
                  Carpoolは、少年野球・サッカーなどのスポーツチーム向けに、車出し確認と乗車割り当てをまとめやすくする配車管理アプリです。
                  管理者が配車日程を作り、保護者が可否を回答し、配車係が誰をどの車に乗せるかを確認できます。
                </p>
                <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-950">まずは登録なしでデモを確認できます</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    「LINEでの車出し確認をアプリにするとどうなるか」だけでも確認できます。実際にチームで使う前に、
                    配車作成、保護者の回答、乗車割り当ての流れを見てください。
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
                    少年野球の車出し確認をラクにする方法
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    少年野球チームで車出し確認をLINEで集める時の手順、よくあるミス、配車係の負担を減らす整理方法をまとめています。
                  </p>
                  <Link href="/guides/youth-baseball-car-dispatch" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900">
                    記事を読む
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                  <h2 className="text-lg font-bold text-gray-950">
                    少年サッカーの遠征配車をラクにする方法
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    少年サッカーの試合・遠征で、車出し確認や乗車割り当てをLINEでまとめる時の注意点を解説しています。
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
                <li>LINE配車管理の流れ</li>
                <li>配車係がつまずきやすい課題</li>
                <li>車出し確認と乗車割り当ての整理方法</li>
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
