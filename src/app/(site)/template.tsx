import styles from "./template.module.css";

/**
 * Site-wide page transition. `template.tsx` (unlike `layout.tsx`) creates a
 * fresh instance on every navigation, so the CSS enter animation replays each
 * time — a subtle fade + lift that makes moving between pages feel cohesive.
 * The fixed navbar/footer live in the layout, so only the page body animates.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className={styles.pageTransition}>{children}</div>;
}
