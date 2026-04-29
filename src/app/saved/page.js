"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Home, ArrowLeft, Trash2, MapPin, DollarSign, Maximize, Calendar, X, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp, Navigation, ExternalLink, Car } from 'lucide-react';
import Link from 'next/link';

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [mapDestination, setMapDestination] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [isLoadingTime, setIsLoadingTime] = useState(false);

  const closeModal = () => {
    setSelectedItem(null);
    setDestinationInput('');
    setMapDestination('');
    setTravelTime('');
  };

  const handleRouteSubmit = async () => {
    if (!destinationInput.trim() || !selectedItem) return;
    setMapDestination(destinationInput);
    
    const origin = (selectedItem.result.basicInfo && (selectedItem.result.basicInfo["詳細地址"] || selectedItem.result.basicInfo["名稱或地址"]) && selectedItem.result.basicInfo["名稱或地址"] !== "未提供") 
      ? (selectedItem.result.basicInfo["詳細地址"] && selectedItem.result.basicInfo["詳細地址"] !== "未提供" ? selectedItem.result.basicInfo["詳細地址"] : selectedItem.result.basicInfo["名稱或地址"]) 
      : selectedItem.formData.address;

    setIsLoadingTime(true);
    setTravelTime('推估中...');
    try {
      const res = await fetch('/api/commute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination: destinationInput })
      });
      const data = await res.json();
      if (res.ok && data.time) {
        setTravelTime(data.time);
        
        // Save to localStorage
        const updatedItems = savedItems.map(item => {
          if (item.id === selectedItem.id) {
            return {
              ...item,
              commuteInfo: { destination: destinationInput, time: data.time }
            };
          }
          return item;
        });
        setSavedItems(updatedItems);
        localStorage.setItem('house_hunter_saved', JSON.stringify(updatedItems));
      } else {
        setTravelTime('無法估算');
      }
    } catch (e) {
      setTravelTime('估算失敗');
    } finally {
      setIsLoadingTime(false);
    }
  };

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
              <div key={item.id} className={`${styles.card} glass-panel`} onClick={() => {
                setSelectedItem(item);
                if (item.commuteInfo) {
                  setDestinationInput(item.commuteInfo.destination);
                  setMapDestination(item.commuteInfo.destination);
                  setTravelTime(item.commuteInfo.time);
                } else {
                  setDestinationInput('');
                  setMapDestination('');
                  setTravelTime('');
                }
              }}>
                {item.result.imageUrls && item.result.imageUrls.length > 0 ? (
                  <div className={styles.cardImageContainer}>
                    <img src={`/api/image?url=${encodeURIComponent(item.result.imageUrls[0])}`} alt="房屋照片" className={styles.cardImage} onError={(e) => { e.target.style.display = 'none'; }} />
                    <div className={styles.cardHeaderOverlay}>
                      <div className={styles.scoreBadge}>
                        {item.result.score} 分
                      </div>
                      <button onClick={(e) => handleDelete(e, item.id)} className={styles.deleteBtn} title="刪除紀錄">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardHeader}>
                    <div className={styles.scoreBadge}>
                      {item.result.score} 分
                    </div>
                    <button onClick={(e) => handleDelete(e, item.id)} className={styles.deleteBtn} title="刪除紀錄">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}

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
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={`${styles.modalContent} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>
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
                  <h4><MapPin size={18} /> 地理位置與路線規劃</h4>
                  <div className={styles.mapContainer}>
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={(() => {
                        const origin = (selectedItem.result.basicInfo && (selectedItem.result.basicInfo["詳細地址"] || selectedItem.result.basicInfo["名稱或地址"]) && selectedItem.result.basicInfo["名稱或地址"] !== "未提供") 
                          ? (selectedItem.result.basicInfo["詳細地址"] && selectedItem.result.basicInfo["詳細地址"] !== "未提供" ? selectedItem.result.basicInfo["詳細地址"] : selectedItem.result.basicInfo["名稱或地址"]) 
                          : selectedItem.formData.address;
                        
                        if (mapDestination) {
                          return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(mapDestination)}&t=&z=14&ie=UTF8&output=embed`;
                        }
                        return `https://maps.google.com/maps?q=${encodeURIComponent(origin)}&t=&z=16&ie=UTF8&output=embed`;
                      })()}
                    ></iframe>
                  </div>
                  
                  <div className={styles.routeControls}>
                    <input 
                      type="text" 
                      className={styles.routeInput} 
                      placeholder="想計算通勤時間嗎？請輸入目的地 (如：公司、學校)..." 
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRouteSubmit()}
                    />
                    <div className={styles.routeActions}>
                      <button className={styles.routeBtn} onClick={handleRouteSubmit} type="button">
                        <Navigation size={16} /> 預覽路線
                      </button>
                      {mapDestination && (
                        <a 
                          href={(() => {
                            const origin = (selectedItem.result.basicInfo && (selectedItem.result.basicInfo["詳細地址"] || selectedItem.result.basicInfo["名稱或地址"]) && selectedItem.result.basicInfo["名稱或地址"] !== "未提供") 
                              ? (selectedItem.result.basicInfo["詳細地址"] && selectedItem.result.basicInfo["詳細地址"] !== "未提供" ? selectedItem.result.basicInfo["詳細地址"] : selectedItem.result.basicInfo["名稱或地址"]) 
                              : selectedItem.formData.address;
                            return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(mapDestination)}`;
                          })()}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.routeLinkBtn}
                        >
                          <ExternalLink size={16} /> 在 Google Maps 開啟
                        </a>
                      )}
                    </div>
                    {travelTime && (
                      <div className={styles.timeDisplay}>
                        <Car size={18} className={styles.carIcon} />
                        <span>預估開車車程：<strong>{travelTime}</strong></span>
                      </div>
                    )}
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
