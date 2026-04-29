"use client";

import styles from './page.module.css';
import { Home, Map, Sparkles, ArrowRight, Compass, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      localStorage.setItem('house_hunter_quick_search', inputValue);
    }
    router.push('/analyze');
  };
  return (
    <div className={styles.container}>
      {/* Background Image & Overlay */}
      <div className={styles.heroBackground}>
        <Image 
          src="/hero-bg.png" 
          alt="Modern House at Twilight" 
          fill
          priority
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay}></div>
      </div>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.heroSection}>
          <div className={`${styles.tagline} animate-fade-in`}>
            <Sparkles className={styles.taglineIcon} size={16} />
            <span>AI-Powered Real Estate Assistant</span>
          </div>
          <h1 className={`${styles.title} animate-fade-in delay-1`}>
            找尋理想家園<br />
            <span className="gradient-text">前所未有的智慧體驗</span>
          </h1>
          <p className={`${styles.subtitle} animate-fade-in delay-2`}>
            輸入房屋資訊，讓 AI 瞬間為您分析優缺點。
            安排看房行程，自動規劃最佳交通路線，讓看房變得輕鬆高效。
          </p>

          <div className={`${styles.actionContainer} animate-fade-in delay-2`}>
            <form onSubmit={handleSearch} className={`${styles.searchBar} glass-panel`}>
              <Search className={styles.searchIcon} />
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="貼上房屋物件連結或輸入地址開始分析..." 
                className={styles.searchInput}
              />
              <button type="submit" className={styles.analyzeButton}>
                立即分析 <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        <div className={`${styles.featureGrid} animate-fade-in delay-2`}>
          <Link href="/analyze" className={`${styles.featureCard} glass-panel`}>
            <div className={styles.cardIconWrapper}>
              <Sparkles className={styles.cardIcon} />
            </div>
            <h3>AI 房屋分析</h3>
            <p>洞察房屋潛在優缺點、周邊環境評估與投資自住建議，避免踩雷。</p>
          </Link>
          
          <Link href="/saved" className={`${styles.featureCard} glass-panel`}>
            <div className={`${styles.cardIconWrapper} ${styles.savedIconWrapper}`}>
              <Map className={styles.cardIcon} />
            </div>
            <h3>口袋名單追蹤</h3>
            <p>收藏您心儀的物件，一目了然比較各項條件與 AI 綜合評分。</p>
          </Link>

          <Link href="/route" className={`${styles.featureCard} glass-panel`}>
            <div className={`${styles.cardIconWrapper} ${styles.routeIconWrapper}`}>
              <Compass className={styles.cardIcon} />
            </div>
            <h3>看房路線規劃</h3>
            <p>自動排列最佳看房順序，估算交通時間，讓您的一日看房行程不手忙腳亂。</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
