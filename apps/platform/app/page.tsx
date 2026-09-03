import HotelOnboarding from "./hotel-onboarding";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <a className={styles.logo} href="/" aria-label="Parley home">
          <span>P</span> Parley
        </a>
        <div className={styles.navLinks}>
          <a href="#how">How it works</a>
          <a href="#onboard">For hotels</a>
          <a href="/docs/rfc">Open standard</a>
          <a className={styles.navCta} href="/demo">Live demo</a>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>More direct bookings, on your terms</p>
          <h1>Win guests back without racing to the lowest price.</h1>
          <p className={styles.lede}>
            Tell Parley how you like to make a deal—in normal, everyday language.
            When a guest asks ChatGPT for a better direct rate, your website can offer
            the right price or perk while protecting what you earn.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryButton} href="#onboard">Make my hotel agent-ready</a>
            <a className={styles.secondaryButton} href="/demo">
              See it negotiate <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={styles.heroProof}>
            <span>Works where guests already ask</span>
            <span>You choose every boundary</span>
            <span>Only the guest can book</span>
          </div>
        </div>

        <aside className={styles.economicsCard} aria-label="Direct booking economics">
          <div className={styles.economicsTop}>
            <span>One €100 booking</span><span>illustrative</span>
          </div>
          <div className={styles.commissionNumber}>€20</div>
          <p>of a typical booking can go to an OTA. Parley helps you put that money to better use.</p>
          <div className={styles.economicsFlow}>
            <div><span>Guest</span><strong>better value</strong></div>
            <div><span>Hotel</span><strong>higher net</strong></div>
            <div><span>Parley</span><strong>3% fee</strong></div>
          </div>
          <div className={styles.floorNote}>
            <span aria-hidden="true">◆</span> Your minimum earnings are protected on every offer.
          </div>
        </aside>
      </section>

      <section className={styles.proofStrip} aria-label="Product principles">
        <div><strong>10 minutes</strong><span>to describe how you sell</span></div>
        <div><strong>One inbox</strong><span>for consented guest enquiries</span></div>
        <div><strong>Your rules</strong><span>for every automatic offer</span></div>
        <div><strong>Human final say</strong><span>on booking and payment</span></div>
      </section>

      <section className={styles.how} id="how">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>A new direct-booking conversation</p>
          <h2>Your website can make the guest a real offer.</h2>
          <p>
            Guests ask in their own words. Parley checks your availability and house
            rules, then shows both sides exactly what was offered and why.
          </p>
        </div>
        <div className={styles.steps}>
          <article>
            <span>01</span><h3>A guest asks for a better deal</h3>
            <p>Their agent checks the dates, room needs and what matters most to them.</p>
          </article>
          <article>
            <span>02</span><h3>Parley follows your house rules</h3>
            <p>It can offer breakfast before discounting, protect busy dates and bring groups to you.</p>
          </article>
          <article>
            <span>03</span><h3>The guest chooses</h3>
            <p>They see one clear direct offer. Only the guest can accept it or share contact details.</p>
          </article>
        </div>
      </section>

      <HotelOnboarding />

      <section className={styles.openWeb}>
        <div>
          <p className={styles.eyebrow}>For your website partner</p>
          <h2>Copy one small file now. Add live offers when you are ready.</h2>
        </div>
        <p>
          You do not need to replace your booking engine. Start by giving the copy-ready
          file to whoever manages your website. The technical details and future PMS
          connection are documented for them.
        </p>
        <div className={styles.docLinks}>
          <a href="/docs/level0">Level 0 specification</a>
          <a href="/docs/rfc">Negotiation RFC</a>
          <a href="/docs/integration">Integration guide</a>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.logo} href="/"><span>P</span> Parley</a>
        <p>Negotiable direct booking for the agentic web.</p>
        <div>
          <a href="/demo">Demo hotel</a>
          <a href="/owner">Owner panel</a>
          <a href="https://github.com/bpais88/Parley">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
