import Script from "next/script";
import styles from "./page.module.css";

export const metadata = {
  title: "Casa do Zêzere — Direct stays",
  description: "A family hotel in central Portugal with agent-ready, negotiable direct rates.",
};

export default function DemoHotelPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Hotel navigation">
        <div className={styles.brand}>Casa do Zêzere</div>
        <div className={styles.navlinks}>
          <span>Stay</span><span>The lake</span><span>Our table</span><span>Contact</span>
        </div>
      </nav>
      <main>
        <section className={styles.hero}>
          <p className={styles.kicker}>Ferreira do Zêzere · Portugal</p>
          <h1>Slow mornings by the water.</h1>
          <p className={styles.heroText}>
            Twenty quiet rooms, a family table, and the pine-framed shores of Castelo do Bode.
            Book direct and ask us for a better stay, not just a lower number.
          </p>
          <div className={styles.dealBadge}>This hotel negotiates direct with your agent</div>
        </section>
        <section className={styles.content}>
          <div>
            <p className={styles.kicker}>A small Portuguese family hotel</p>
            <h2>Lake days, local food, and room to breathe.</h2>
          </div>
          <div className={styles.facts}>
            <div><strong>20</strong><span>rooms</span></div>
            <div><strong>€110</strong><span>direct flex</span></div>
            <div><strong>12%</strong><span>possible direct saving</span></div>
          </div>
        </section>
      </main>
      <Script
        src="/kit/v1/kit.js"
        strategy="afterInteractive"
        data-property="casa-do-zezere"
        data-api=""
      />
    </div>
  );
}
