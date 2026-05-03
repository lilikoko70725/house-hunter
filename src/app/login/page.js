'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to home page and refresh router state
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || '登入失敗，請確認帳號密碼。');
      }
    } catch (err) {
      setError('發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
      </div>

      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Building2 size={48} className={styles.logoIcon} />
          <h1 className={styles.title}>
            House <span className="gradient-text">Hunter</span>
          </h1>
          <p className={styles.subtitle}>請登入以存取系統功能與 API</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          {error && (
            <div className={styles.errorMsg}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>帳號</label>
            <div className={styles.inputWrapper}>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                className={styles.input}
                required
                autoComplete="username"
              />
              <User size={20} className={styles.inputIcon} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>密碼</label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className={styles.input}
                required
                autoComplete="current-password"
              />
              <Lock size={20} className={styles.inputIcon} />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={22} className={styles.spinner} />
                <span>登入中...</span>
              </>
            ) : (
              <>
                <span>登入系統</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
