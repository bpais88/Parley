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
          <p className={styles.eyebrow}>Direct booking, now agent-native</p>
          <h1>Turn OTA commission into a direct-booking advantage.</h1>
          <p className={styles.lede}>
            Parley lets a guest&apos;s agent negotiate on your hotel website—within the
            rules you set. Guests get a better deal, you keep more revenue, and the
            final booking decision always stays human.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryButton} href="#onboard">Make my hotel agent-ready</a>
            <a className={styles.secondaryButton} href="/demo">
              See it negotiate <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={styles.heroProof}>
            <span>Built for the ChatGPT browser</span>
            <span>Deterministic deal floors</span>
            <span>No agent can accept or pay</span>
          </div>
        </div>

        <aside className={styles.economicsCard} aria-label="Direct booking economics">
          <div className={styles.economicsTop}>
            <span>One €100 booking</span><span>illustrative</span>
          </div>
          <div className={styles.commissionNumber}>€20</div>
          <p>typical OTA commission becomes room to negotiate</p>
          <div className={styles.economicsFlow}>
            <div><span>Guest</span><strong>better value</strong></div>
            <div><span>Hotel</span><strong>higher net</strong></div>
            <div><span>Parley</span><strong>3% fee</strong></div>
          </div>
          <div className={styles.floorNote}>
            <span aria-hidden="true">◆</span> Your hard floor is enforced in code, on every offer.
          </div>
        </aside>
      </section>

      <section className={styles.proofStrip} aria-label="Product principles">
        <div><strong>1 tag</strong><span>to add the WebMCP kit</span></div>
        <div><strong>0 tools</strong><span>that accept, pay, or cancel</span></div>
        <div><strong>2 identities</strong><span>visible on one timeline</span></div>
        <div><strong>100%</strong><span>deterministic negotiation math</span></div>
      </section>

      <section className={styles.how} id="how">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>A direct channel agents can use</p>
          <h2>The hotel website stops being a brochure.</h2>
          <p>
            WebMCP lets the agent act in the page the guest is already viewing, sharing
            its dates, room choice, live inventory, and offer state.
          </p>
        </div>
        <div className={styles.steps}>
          <article>
            <span>01</span><h3>The guest sets the brief</h3>
            <p>Their agent reads the current stay, compares plans, and holds real inventory.</p>
          </article>
          <article>
            <span>02</span><h3>Your policy makes the offer</h3>
            <p>Parley trades price and perks inside a floor that never undercuts your OTA net.</p>
          </article>
          <article>
            <span>03</span><h3>A person closes the booking</h3>
            <p>The offer appears in a transparent timeline. Only the guest can accept and pay.</p>
          </article>
        </div>
      </section>

      <HotelOnboarding />

      <section className={styles.openWeb}>
        <div>
          <p className={styles.eyebrow}>For the open web</p>
          <h2>Start with one JSON file. Grow into a live negotiation layer.</h2>
        </div>
        <p>
          Parley&apos;s Level 0 convention gives any hotel an agent-readable discovery signal,
          even before installing the kit. The protocol, safety boundary, and PMS integration
          path are documented in public.
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
