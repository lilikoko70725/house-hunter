"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Home, ArrowLeft, Trash2, MapPin, DollarSign, Maximize, Calendar, X, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    setIsClient(true);
    const items = JSON.parse(localStorage.getItem('house_hunter_saved') || '[]');
    setSavedItems(items);
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation(); // prevent opening the modal
    if (confirm('確定要刪除這筆分析紀錄嗎？')) {
      const newItems = savedItems.filter(item => item.id !== id);
      setSavedItems(newItems);
      localStorage.setItem('house_hunter_saved', JSON.stringify(newItems));
    }
  };

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        {savedItems.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <h2>目前還沒有儲存的紀錄</h2>
            <p>去分析一些房子，然後把它們加到這裡吧！</p>
            <Link href="/analyze" className={styles.goAnalyzeBtn}>前往 AI 房屋分析</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {savedItems.map((item) => (
              <div key={item.id} className={`${styles.card} glass-panel`} onClick={() => setSelectedItem(item)}>
                <div className={styles.cardHeader}>
                  <div className={styles.scoreBadge}>
                    {item.result.score} 分
                  </div>
                  <button onClick={(e) => handleDelete(e, item.id)} className={styles.deleteBtn} title="刪除紀錄">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.address}>
                    <MapPin size={16} className={styles.icon} /> 
                    {item.formData.address || '未提供地址'}
                  </h3>
                  
                  <div className={styles.tags}>
                    {item.formData.price && (
                      <span className={styles.tag}><DollarSign size={14} /> {item.formData.price} 萬</span>
                    )}
                    {item.formData.size && (
                      <span className={styles.tag}><Maximize size={14} /> {item.formData.size} 坪</span>
                    )}
                    {item.formData.age && (
                      <span className={styles.tag}><Calendar size={14} /> {item.formData.age} 年</span>
                    )}
                  </div>

                  <div className={styles.summaryBox}>
                    <p>{item.result.summary}</p>
                  </div>

                  <div className={styles.prosCons}>
                    <div className={styles.pros}>
                      <strong>優點：</strong>
                      <ul>
                        {item.result.pros?.slice(0, 2).map((pro, idx) => <li key={idx}>{pro}</li>)}
                        {item.result.pros?.length > 2 && <li>...等 {item.result.pros.length} 項優點</li>}
                      </ul>
                    </div>
                    <div className={styles.cons}>
                      <strong>抗性：</strong>
                      <ul>
                        {item.result.cons?.slice(0, 2).map((con, idx) => <li key={idx}>{con}</li>)}
                        {item.result.cons?.length > 2 && <li>...等 {item.result.cons.length} 項缺點</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={`${styles.modalContent} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedItem(null)}>
              <X size={24} />
            </button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalScoreBadge}>
                <span className={styles.scoreNum}>{selectedItem.result.score}</span> 分
              </div>
              <h2 className={styles.modalTitle}>
                <MapPin size={24} className={styles.icon} />
                {selectedItem.formData.address || '房屋分析報告'}
              </h2>
            </div>

            <div className={styles.modalBody}>
              {/* Map Section */}
              {((selectedItem.result.basicInfo && (selectedItem.result.basicInfo["詳細地址"] || selectedItem.result.basicInfo["名稱或地址"]) && selectedItem.result.basicInfo["名稱或地址"] !== "未提供") || (selectedItem.formData.address && !selectedItem.formData.address.startsWith('http'))) && (
                <div className={styles.modalSection}>
                  <h4><MapPin size={18} /> 地理位置與周邊環境</h4>
                  <div className={styles.mapContainer}>
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(
                        (selectedItem.result.basicInfo && (selectedItem.result.basicInfo["詳細地址"] || selectedItem.result.basicInfo["名稱或地址"]) && selectedItem.result.basicInfo["名稱或地址"] !== "未提供") 
                          ? (selectedItem.result.basicInfo["詳細地址"] && selectedItem.result.basicInfo["詳細地址"] !== "未提供" ? selectedItem.result.basicInfo["詳細地址"] : selectedItem.result.basicInfo["名稱或地址"]) 
                          : selectedItem.formData.address
                      )}&t=&z=16&ie=UTF8&output=embed`}
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              {selectedItem.result.basicInfo && (
                <div className={styles.modalSection}>
                  <h4>房屋基本資料</h4>
                  <table className={styles.infoTable}>
                    <tbody>
                      {Object.entries(selectedItem.result.basicInfo).map(([key, value]) => (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Price Analysis */}
              {selectedItem.result.priceAnalysis && (
                <div className={`${styles.modalSection} ${styles.priceSection}`}>
                  <h4><TrendingUp size={18} /> 實價登錄與行情比對</h4>
                  <div className={styles.priceHighlight}>
                    區域行情推估：<strong>{selectedItem.result.priceAnalysis.estimatedMarketPrice}</strong>
                  </div>
                  <p>{selectedItem.result.priceAnalysis.comparison}</p>
                </div>
              )}

              {/* Pros & Cons */}
              <div className={styles.modalGrid}>
                <div className={`${styles.modalSection} ${styles.prosSection}`}>
                  <h4><CheckCircle2 size={18} /> 優點分析</h4>
                  <ul>
                    {selectedItem.result.pros?.map((pro, idx) => <li key={idx}>{pro}</li>)}
                  </ul>
                </div>
                <div className={`${styles.modalSection} ${styles.consSection}`}>
                  <h4><AlertTriangle size={18} /> 劣勢與抗性</h4>
                  <ul>
                    {selectedItem.result.cons?.map((con, idx) => <li key={idx}>{con}</li>)}
                  </ul>
                </div>
              </div>

              {/* Summary */}
              <div className={`${styles.modalSection} ${styles.summarySection}`}>
                <h4><Lightbulb size={18} /> 購屋建議</h4>
                <p>{selectedItem.result.summary}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
