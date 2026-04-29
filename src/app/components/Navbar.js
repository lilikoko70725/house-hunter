"use client";

import Link from 'next/link';
import { Home, Sparkles, Map, Compass } from 'lucide-react';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <div className={styles.navbarContainer}>
      <nav className={`${styles.navbar} glass-panel`}>
        <Link href="/" className={styles.logo}>
          <Home className={styles.logoIcon} />
          <span>House<span className={styles.logoHighlight}>Hunter</span></span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/analyze" className={`${styles.navLink} ${pathname === '/analyze' ? styles.active : ''}`}>
            <Sparkles size={16} /> <span className={styles.navText}>智慧分析</span>
          </Link>
          <Link href="/saved" className={`${styles.navLink} ${pathname === '/saved' ? styles.active : ''}`}>
            <Map size={16} /> <span className={styles.navText}>口袋名單</span>
          </Link>
          <Link href="/route" className={`${styles.navLink} ${pathname === '/route' ? styles.active : ''}`}>
            <Compass size={16} /> <span className={styles.navText}>行程規劃</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
