import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/app/_components/Footer";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://carpool-navy.vercel.app").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "プライバシーポリシー｜Carpool",
  description: "Carpoolで取り扱う情報、利用目的、チーム内の共有、アクセス解析、広告、お問い合わせ窓口についてご案内します。",
  alternates: { canonical: `${siteUrl}/privacy` },
};

const externalLinkClass = "break-words text-teal-800 underline underline-offset-4";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-teal-100 bg-white px-5 py-5">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-xl font-bold text-teal-800">Carpool</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-2xl font-bold leading-relaxed sm:text-3xl">プライバシーポリシー</h1>
        <p className="mt-3 text-sm text-slate-500">制定日：2026年9月17日</p>
        <p className="mt-6 leading-8">
          Carpool運営者（以下「運営者」）は、配車管理サービス「Carpool」における情報の取扱いを、以下のとおり定めます。
        </p>
        <div className="mt-10 space-y-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_p]:leading-8 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:leading-8">
          <section aria-labelledby="collected-information">
            <h2 id="collected-information">1. 取り扱う情報</h2>
            <ul>
              <li>管理者の登録情報（氏名、メールアドレス、認証に必要な情報）</li>
              <li>チーム名、保護者・子どもの氏名や学年、車の座席数など、チーム運営のために入力された情報</li>
              <li>配車の日程・目的地・集合場所、参加や車出しの可否、乗車の割り当て、コメントなど</li>
              <li>遠征費精算の費用、負担額、入金・返金の記録、および精算時点の参加者・配車情報など</li>
              <li>有料プランの契約状況、決済サービスの顧客・契約識別子、支払いに関する記録</li>
              <li>お問い合わせやフィードバックの内容、返信用メールアドレス、送信者に関連する情報</li>
              <li>アクセスしたページ、操作・利用状況、ブラウザや端末に関する情報、Cookie等の識別子、アクセスに伴う通信情報</li>
            </ul>
          </section>
          <section aria-labelledby="purposes">
            <h2 id="purposes">2. 利用目的</h2>
            <p>サービスの提供・認証、チーム内の配車調整・情報共有・費用精算、有料プランの管理、お問い合わせへの対応、不正利用の防止、障害対応、利用状況の分析とサービス改善のために利用します。広告を掲載する場合、Cookie等の識別子や閲覧情報が、広告の配信・効果測定に利用されることがあります。</p>
          </section>
          <section aria-labelledby="team-sharing">
            <h2 id="team-sharing">3. チーム内での共有と子どもの情報</h2>
            <p>登録されたメンバー・子ども・配車などの情報は、各画面の機能に応じて、チームの管理者や共有URL・PINコードで参加するメンバーに表示されます。共有URLやPINコードは、参加を認める相手に限って共有してください。</p>
            <p className="mt-3">Carpoolは、保護者やチーム運営者による利用を想定しています。他の保護者や子どもの情報を登録する際は、本人や保護者に利用目的と共有範囲を説明し、必要な同意を得てください。コメント等には、配車に必要のない健康情報などの機微な情報を入力しないでください。</p>
          </section>
          <section aria-labelledby="service-providers">
            <h2 id="service-providers">4. 外部サービスと第三者への提供</h2>
            <p>運営者は、サービス提供に必要な範囲で外部サービスを利用します。認証・データ保管にSupabase、サイト配信にVercel、決済にStripe、アクセス解析にGoogle Analyticsを利用しています。クレジットカード情報はStripeの決済画面で入力され、Carpoolのデータベースにはカード番号全体を保存しません。</p>
            <p className="mt-3">チーム内の共有、サービス提供に必要な委託・外部サービスの利用、本人の同意がある場合、法令に基づく場合などを除き、個人情報を第三者へ提供しません。外部サービスでは国外で情報が取り扱われる場合があります。各事業者の取扱いは、以下をご確認ください。</p>
            <ul className="mt-3">
              <li><a href="https://supabase.com/privacy" className={externalLinkClass}>Supabaseのプライバシーポリシー</a></li>
              <li><a href="https://vercel.com/legal/privacy-policy" className={externalLinkClass}>Vercelのプライバシーポリシー</a></li>
              <li><a href="https://stripe.com/jp/privacy" className={externalLinkClass}>Stripeのプライバシーポリシー</a></li>
              <li><a href="https://policies.google.com/privacy?hl=ja" className={externalLinkClass}>Googleのプライバシーポリシー</a></li>
            </ul>
          </section>
          <section aria-labelledby="analytics">
            <h2 id="analytics">5. Cookie・ブラウザ保存領域とアクセス解析</h2>
            <p>ログイン状態やチームへの参加状態の維持などに、ブラウザの保存領域を利用します。また、Google Analyticsによるアクセス解析では、Cookie等を使用し、ページ閲覧や操作、登録・プラン購入などのイベントを収集します。イベントには、サービス内の管理者・チーム・配車・契約の識別子や購入金額などが含まれる場合があります。</p>
            <p className="mt-3">ブラウザの設定でCookie等を制限・削除できますが、ログインなど一部の機能が利用できなくなる場合があります。Google Analyticsによる収集の制限については、<a href="https://tools.google.com/dlpage/gaoptout?hl=ja" className={externalLinkClass}>Google Analyticsオプトアウトアドオン</a>をご確認ください。Googleによるデータ利用については、<a href="https://policies.google.com/technologies/partner-sites?hl=ja" className={externalLinkClass}>Googleのパートナーサイトでの情報の取扱い</a>をご確認ください。</p>
          </section>
          <section aria-labelledby="advertising">
            <h2 id="advertising">6. 広告について</h2>
            <p>Carpoolでは、Google AdSenseによる広告掲載の準備を進めています。広告の配信を開始した場合、Googleなどの第三者配信事業者や広告ネットワークがCookieを使用し、本サイトや他のサイトへの過去のアクセス情報に基づいて広告を表示することがあります。Googleおよびそのパートナーは、広告Cookieにより利用者に応じた広告を配信する場合があります。</p>
            <p className="mt-3">パーソナライズド広告は、<a href="https://myadcenter.google.com/" className={externalLinkClass}>Googleの広告設定</a>から管理できます。第三者配信事業者によるパーソナライズド広告の設定は、<a href="https://optout.aboutads.info/" className={externalLinkClass}>About Adsのオプトアウトページ</a>でも確認できます。詳細は<a href="https://policies.google.com/technologies/ads?hl=ja" className={externalLinkClass}>Googleの広告に関する説明</a>をご確認ください。</p>
          </section>
          <section aria-labelledby="retention">
            <h2 id="retention">7. 情報の管理・保存</h2>
            <p>認証やアクセス制御等により、情報の漏えい・不正アクセスの防止に努めます。情報は、サービスの提供、トラブル対応、精算・取引記録の確認、法令上の義務への対応などに必要な範囲で保存します。元の配車やメンバーを削除した場合でも、精算時点の記録や決済記録等が残る場合があります。</p>
          </section>
          <section aria-labelledby="contact">
            <h2 id="contact">8. 確認・訂正・削除のお問い合わせ</h2>
            <p>チームの登録情報の変更は、まずチーム管理者へご相談ください。運営者が取り扱う個人情報の確認・訂正・削除・利用停止のご希望、その他本ポリシーについてのお問い合わせは、以下の窓口へお寄せください。ご本人や管理権限を確認のうえ、法令とサービスの記録保持の必要性に応じて対応します。</p>
            <p className="mt-3">運営者：Carpool運営者<br />連絡先：<a href="mailto:carpool.app.2026@gmail.com" className={externalLinkClass}>carpool.app.2026@gmail.com</a></p>
          </section>
          <section aria-labelledby="changes">
            <h2 id="changes">9. 本ポリシーの変更</h2>
            <p>サービスや情報の取扱いの変更に応じて、本ポリシーを更新します。重要な変更がある場合は、本サイト上でお知らせするなど、変更内容に応じた方法でご案内します。</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
