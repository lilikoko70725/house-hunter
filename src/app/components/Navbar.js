"use client";

import Link from 'next/link';
import { Home, Sparkles, Map, Compass, Scale, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

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
          <Link href="/compare" className={`${styles.navLink} ${pathname === '/compare' ? styles.active : ''}`}>
            <Scale size={16} /> <span className={styles.navText}>統計比較</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} title="登出">
            <LogOut size={16} /> <span className={styles.navText}>登出</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
