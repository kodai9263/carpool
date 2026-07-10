import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  Car,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { Footer } from "./_components/Footer";
import { LpTracker, TrackedLink } from "./_components/LpTracker";
import { FeaturesSection } from "./_components/FeaturesSection";
import { prisma } from "@/lib/prisma";
import {
  AUTO_ASSIGN_FREE_TRIAL_LIMIT,
  FREE_TEAM_LIMIT,
  PRO_MONTHLY_PRICE_JPY,
  PRO_YEARLY_PRICE_JPY,
} from "@/utils/billing";

export const dynamic = "force-dynamic";

const problems = [
  "LINEで誰が乗せるか毎回確認している",
  "Excelの更新履歴が追えない",
  "急な欠席で配車の調整が大変",
  "言った・言わないのトラブルが心配",
];

const benefits = [
  { icon: ClipboardList, title: "回答を集める", desc: "保護者の配車可否と子どもの参加可否を一画面で確認。" },
  { icon: Sparkles, title: "自動で割り当て", desc: "座席数に合わせて、子どもをドライバーへ自動アサイン。" },
  { icon: CalendarCheck, title: "当日も確認", desc: "参加者・欠席者をその場で見られるので調整が早い。" },
];

const adminSteps = [
  { n: "1", title: "チームを作成", desc: "チームID・チーム名・PINコードを登録します。" },
  { n: "2", title: "メンバーを登録", desc: "保護者名と子どもの名前・学年を登録します。" },
  { n: "3", title: "配車日程を作成", desc: "日付・行き先・集合場所を登録し、回答期限を設定できます。" },
  { n: "4", title: "配車を確定", desc: "回答を確認し、自動割り当てや手動調整で配車を保存します。" },
];

const memberSteps = [
  { n: "1", title: "PINコードで参加", desc: "アカウント登録なしで配車閲覧コードを入力します。" },
  { n: "2", title: "可否を回答", desc: "配車可・引率可・自走・不参加を選んで送信します。" },
  { n: "3", title: "配車結果を確認", desc: "誰の車に乗るか、当日の参加者・欠席者を確認できます。" },
];

const freeFeatures = [
  "1チームまで無料",
  `自動アサインは${AUTO_ASSIGN_FREE_TRIAL_LIMIT}回までお試し`,
  "メンバーはアカウント登録なしで参加",
  "LINEに貼れる共有テキストをコピー",
];

const proFeatures = [
  "自動アサインを無制限で利用",
  "複数チームの管理",
  "未回答者へのLINEリマインド通知（近日追加）",
  "車出し回数の集計（近日追加）",
];

const faqs = [
  {
    question: "無料でどこまで使えますか？",
    answer: `まずは${FREE_TEAM_LIMIT}チームを無料で使えます。配車作成、メンバー回答、LINE共有、自動割り当て${AUTO_ASSIGN_FREE_TRIAL_LIMIT}回までを試せます。`,
  },
  {
    question: "メンバーにも登録や支払いが必要ですか？",
    answer: "不要です。管理者がPINコードとURLをLINEなどで共有すれば、メンバーはアカウントなしで回答できます。",
  },
  {
    question: "Proはどんな人向けですか？",
    answer: "複数チームを管理したい方や、自動割り当てを継続的に使いたい配車係向けです。",
  },
  {
    question: "支払い開始後にすぐ使えなくなりますか？",
    answer: "既存の1チーム利用を急に止める想定はありません。まず無料範囲を明確にし、必要になったタイミングでProを選べる形にします。",
  },
];

const monitorApplicationHref = `mailto:carpool.app.2026@gmail.com?${new URLSearchParams({
  subject: "Carpoolについて相談",
  body: "【チーム種別】少年野球 / サッカー / その他\n【配車で困っていること】\n【今の管理方法】LINE / Excel / 紙 / その他\n",
}).toString()}`;
const monitorInstagramHref = "https://www.instagram.com/arrow_room_repository/";
const monitorDmKeyword = "配車";

const monitorTargets = [
  "少年野球・サッカーなどの配車係",
  "保護者代表・学年代表・コーチ",
  "LINEで車出し可否や乗車割り当てを毎回まとめている方",
];

const monitorSupport = [
  `DMで「${monitorDmKeyword}」と送るだけ`,
  "配車で困っていることを聞かせてください",
  "必要ならデモや使い方を案内します",
];

const monitorRequests = [
  "車出し可否を集める流れ",
  "子どもの参加・欠席の見え方",
  "乗車割り当てと共有のイメージ",
];

export default async function Home() {
  const teamCount = await prisma.team.count();

  return (
    <div className="min-h-screen bg-[#f5f8f4] text-gray-950">
      <LpTracker />

      <section id="section-hero" className="relative overflow-hidden px-4 py-5 md:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(15,118,110,0.13),transparent_28rem),linear-gradient(135deg,#f8fbf7_0%,#edf5ef_58%,#f7f4ed_100%)]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-3 shadow-[0_18px_60px_rgba(15,51,46,0.09)] ring-1 ring-gray-950/[0.02] backdrop-blur md:px-5">
          <TrackedLink href="/" trackLabel="nav_logo" className="flex items-center gap-2.5 font-bold tracking-tight text-gray-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-gradient-to-br from-[#0f766e] via-[#246f68] to-[#183f3c] text-white shadow-[0_10px_26px_rgba(20,83,75,0.24)] ring-1 ring-teal-900/10">
              <Car size={20} strokeWidth={2.35} />
            </span>
            <span className="bg-gradient-to-br from-[#153f3b] to-[#2b7a70] bg-clip-text text-transparent">
              Carpool
            </span>
          </TrackedLink>
          <div className="flex shrink-0 items-center gap-3 md:gap-7">
            <TrackedLink href="/login" trackLabel="login_nav" className="text-sm font-semibold text-gray-600 transition hover:text-teal-800">
              ログイン
            </TrackedLink>
            <TrackedLink href="/signup" trackLabel="signup_nav" className="app-button-primary min-h-10 px-3 text-sm md:min-h-11 md:px-5">
              無料で始める
            </TrackedLink>
          </div>
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 py-14 md:grid-cols-[1fr_1fr] md:gap-16 md:py-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/90 px-3 py-1 text-sm font-semibold text-teal-800 shadow-sm">
              <Users size={15} />
              少年野球・サッカーの配車係さんへ
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.16] tracking-normal text-gray-950 md:text-6xl md:leading-[1.12]">
              配車調整を、
              <br />
              <span className="bg-gradient-to-r from-teal-800 to-[#3f817a] bg-clip-text text-transparent">
                チーム全員で
              </span>
              <br />
              迷わず進める。
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-gray-600 md:text-lg">
              LINEやExcelでのやり取りを減らし、配車可否の収集から自動アサイン、当日の出欠確認までをひとつのアプリで完結します。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href="#section-monitor" trackLabel="contact_hero_scroll" className="app-button-primary min-h-12 px-7 text-base">
                DMで相談する
                <ArrowRight size={18} />
              </TrackedLink>
              <TrackedLink href="/login?guest=true" trackLabel="demo_hero" className="app-button-secondary min-h-12 border-gray-200 bg-white/90 px-7 text-base shadow-sm">
                デモを見る
              </TrackedLink>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="app-status border border-teal-100 bg-white/80 text-teal-800 shadow-sm">
                {teamCount} チームが利用中
              </span>
              <span className="inline-flex items-center gap-1.5">
                <KeyRound size={15} className="text-teal-700" />
                メンバーはPINコードで参加
              </span>
            </div>
          </div>

          <HeroProductMockup />
        </div>
      </section>

      <section id="section-problems" className="px-4 py-16">
        <div className="app-container">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-sm font-semibold text-teal-700">課題と解決</p>
            <h2 className="app-section-title">配車担当の負担を、見える形で減らします。</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="app-card p-5 md:p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-950">よくある困りごと</h3>
              <div className="space-y-3">
                {problems.map((problem) => (
                  <div key={problem} className="flex gap-3 rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm font-medium text-gray-700">
                    <span className="mt-1 h-2 w-2 rounded-full bg-red-400" />
                    {problem}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="app-card p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-gray-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DmContactSection />

      <section id="section-features" className="px-4 py-16">
        <div className="app-container">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-semibold text-teal-700">機能</p>
            <h2 className="app-section-title">Carpoolの特徴</h2>
            <p className="mt-3 text-gray-500">チームの送迎を、今ある運用に合わせてひとつのアプリで完結。</p>
          </div>
          <FeaturesSection />
        </div>
      </section>

      <section id="section-how-to-use" className="px-4 py-16">
        <div className="app-container">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-semibold text-teal-700">使い方</p>
            <h2 className="app-section-title">管理者もメンバーも、迷わず使えます。</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <StepCard title="管理者（コーチ・保護者代表）" steps={adminSteps} />
            <StepCard title="メンバー（保護者）" steps={memberSteps} />
          </div>
        </div>
      </section>

      <PricingSection />

      <FaqSection />

      <section id="section-cta" className="px-4 py-16">
        <div className="app-container">
          <div className="app-card overflow-hidden border-teal-100 bg-gradient-to-br from-[#5aa49a] via-[#4a968d] to-[#3f817a] p-8 text-center text-white shadow-[0_24px_70px_rgba(38,104,96,0.18)] md:p-12">
            <h2 className="text-3xl font-bold md:text-4xl">次の配車から、すぐに軽く。</h2>
            <p className="mt-4 text-white/85">チームを作成して、PINコードを共有するだけで始められます。</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <TrackedLink href={monitorInstagramHref} trackLabel="contact_cta_instagram" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-7 text-base font-bold text-teal-800 shadow-sm transition hover:bg-teal-50">
                Instagramで相談する
              </TrackedLink>
              <TrackedLink href="/login?guest=true" trackLabel="demo_cta" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/45 px-7 text-base font-semibold text-white transition hover:bg-white/10">
                デモを見る
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function DmContactSection() {
  return (
    <section id="section-monitor" className="border-y border-teal-100/80 bg-white/55 px-4 pb-24 pt-16 md:py-16">
      <div className="app-container">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold text-teal-700">Instagram DMで相談できます</p>
            <h2 className="app-section-title">
              配車で困ることを、まず1つだけ聞かせてください。
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-gray-600">
              使うかどうかは後で大丈夫です。InstagramのDMで
              <span className="font-bold text-gray-950">「{monitorDmKeyword}」</span>
              と送ってください。今の配車のまとめ方を聞いたうえで、必要ならデモや使い方を案内します。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href={monitorInstagramHref} trackLabel="contact_section_instagram" className="app-button-primary min-h-12 px-7 text-base">
                InstagramでDMする
                <ArrowRight size={18} />
              </TrackedLink>
              <TrackedLink href="/login?guest=true" trackLabel="demo_monitor" className="app-button-secondary min-h-12 px-7 text-base">
                先にデモを見る
              </TrackedLink>
            </div>

            <p className="mt-3 pr-16 text-xs leading-6 text-gray-500 sm:pr-0">
              Instagramを使っていない方は{" "}
              <TrackedLink href={monitorApplicationHref} trackLabel="contact_section_mail_fallback" className="font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900">
                メールでも相談できます
              </TrackedLink>
              。
            </p>
          </div>

          <div className="app-card overflow-hidden">
            <div className="border-b border-teal-100 bg-teal-50/70 p-5 md:p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-xl font-bold text-gray-950">こんな方に向けたアプリです</h3>
            </div>
            <div className="space-y-3 p-5 md:p-6">
              {monitorTargets.map((target) => (
                <div key={target} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-sm font-medium leading-6 text-gray-700">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-700" />
                  <span>{target}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <MonitorInfoCard title="DMでできること" items={monitorSupport} />
          <MonitorInfoCard title="このページで確認できること" items={monitorRequests} />
        </div>
      </div>
    </section>
  );
}

function MonitorInfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="app-card p-5 md:p-6">
      <h3 className="mb-4 text-base font-bold text-gray-950">{title}</h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600">
            <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingSection() {
  return (
    <section id="section-pricing" className="px-4 py-16">
      <div className="app-container">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold text-teal-700">料金</p>
          <h2 className="app-section-title">1チームは無料。必要になったらProへ。</h2>
          <p className="mt-3 text-sm leading-7 text-gray-500 md:text-base">
            個人の配車係が安心して使い始められるよう、まずは無料で運用できます。
            自動アサインを継続して使いたい、または複数チームの管理が必要になったタイミングでProを検討できます。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="app-card p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="text-xl font-bold text-gray-950">Free</h3>
                <p className="mt-1 text-sm text-gray-500">まずは配車係1人で試したい方向け</p>
              </div>
              <span className="app-status bg-teal-50 text-teal-800">おすすめ</span>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold tracking-normal text-gray-950">¥0</span>
              <span className="ml-2 text-sm font-semibold text-gray-500">/ 月</span>
            </div>

            <PlanFeatureList features={freeFeatures} />

            <TrackedLink href="/signup" trackLabel="signup_pricing_free" className="app-button-primary mt-6 w-full">
              無料で始める
              <ArrowRight size={17} />
            </TrackedLink>
          </div>

          <div className="app-card border-amber-200 bg-amber-50/45 p-5 shadow-[0_22px_60px_rgba(180,83,9,0.10)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                  <WalletCards size={22} />
                </div>
                <h3 className="text-xl font-bold text-gray-950">Pro</h3>
                <p className="mt-1 text-sm text-gray-600">配車調整の手間をもっと減らしたい方向け</p>
              </div>
              <span className="app-status bg-white text-amber-800">相談受付中</span>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold tracking-normal text-gray-950">
                ¥{PRO_YEARLY_PRICE_JPY.toLocaleString("ja-JP")}
              </span>
              <span className="ml-2 text-sm font-semibold text-gray-600">/ 年</span>
              <p className="mt-1 text-xs text-gray-500">
                月あたり{Math.round(PRO_YEARLY_PRICE_JPY / 12)}円。月払い（{PRO_MONTHLY_PRICE_JPY.toLocaleString("ja-JP")}円/月）も選べます
              </p>
            </div>

            <PlanFeatureList features={proFeatures} />

            <TrackedLink
              href="mailto:carpool.app.2026@gmail.com?subject=Carpool%20Pro%E3%83%97%E3%83%A9%E3%83%B3%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6"
              trackLabel="upgrade_lp_pricing"
              className="app-button-secondary mt-6 w-full border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
            >
              Pro利用を相談する
              <CreditCard size={17} />
            </TrackedLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanFeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li key={feature} className="flex gap-3 text-sm leading-6 text-gray-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-700" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function FaqSection() {
  return (
    <section id="section-faq" className="px-4 py-16">
      <div className="app-container">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold text-teal-700">FAQ</p>
          <h2 className="app-section-title">始める前の不安を減らします。</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="app-card p-5">
              <div className="mb-3 flex items-center gap-2 text-gray-950">
                <CircleHelp size={18} className="text-teal-700" />
                <h3 className="font-bold">{faq.question}</h3>
              </div>
              <p className="text-sm leading-7 text-gray-500">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroProductMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[28px] bg-gradient-to-br from-teal-700/10 via-white/40 to-amber-200/20 blur-2xl" />

      <div className="relative ml-auto w-full max-w-[680px] overflow-hidden rounded-2xl border border-white/90 bg-white p-2 shadow-[0_34px_90px_rgba(26,45,42,0.16)]">
        <div className="relative aspect-[16/7.4] overflow-hidden rounded-xl bg-[#eaf5f0]">
          <Image
            src="/header-visual.png"
            alt="Carpoolの紹介ビジュアル"
            width={1408}
            height={768}
            priority
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

function StepCard({
  title,
  steps,
}: {
  title: string;
  steps: { n: string; title: string; desc: string }[];
}) {
  return (
    <div className="app-card p-5 md:p-6">
      <h3 className="mb-5 text-lg font-bold text-gray-950">{title}</h3>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.n} className="flex gap-4 rounded-lg border border-gray-100 bg-gray-50/70 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
              {step.n}
            </span>
            <div>
              <h4 className="font-bold text-gray-950">{step.title}</h4>
              <p className="mt-1 text-sm leading-6 text-gray-500">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
