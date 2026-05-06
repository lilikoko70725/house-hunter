"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Home, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp, ChevronLeft, ChevronRight, X, MapPin, Navigation, ExternalLink, Car } from 'lucide-react';
import Link from 'next/link';

export default function AnalyzePage() {
  const [formData, setFormData] = useState({
    url: '',
    communityName: '',
    address: '',
    price: '',
    size: '',
    age: '',
    floor: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [mapDestination, setMapDestination] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [isLoadingTime, setIsLoadingTime] = useState(false);

  useEffect(() => {
    const quickSearch = localStorage.getItem('house_hunter_quick_search');
    if (quickSearch) {
      let initialData = { ...formData };
      if (quickSearch.startsWith('http')) {
        initialData.url = quickSearch;
      } else {
        initialData.address = quickSearch;
      }
      setFormData(initialData);
      localStorage.removeItem('house_hunter_quick_search');
      
      // Automatically trigger analysis
      performAnalysis(initialData);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const performAnalysis = async (dataToSubmit) => {
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    setIsSaved(false);
    setCurrentImageIndex(0);
    setFailedImages([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '分析失敗');
      }
      
      setResult(data);
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    performAnalysis(formData);
  };

  const handleImageError = (url) => {
    if (!failedImages.includes(url)) {
      setFailedImages(prev => [...prev, url]);
    }
  };

  const validImages = result?.imageUrls?.filter(url => !failedImages.includes(url)) || [];

  const handlePrevImage = () => {
    if (validImages.length > 0) {
      const maxIndex = Math.max(0, validImages.length - 2);
      setCurrentImageIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
    }
  };

  const handleNextImage = () => {
    if (validImages.length > 0) {
      const maxIndex = Math.max(0, validImages.length - 2);
      setCurrentImageIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }
  };

  const handleRouteSubmit = async () => {
    if (!destinationInput.trim()) return;
    setMapDestination(destinationInput);
    
    // Calculate travel time
    const origin = (result.basicInfo && (result.basicInfo["詳細地址"] || result.basicInfo["名稱或地址"]) && result.basicInfo["名稱或地址"] !== "未提供") 
      ? (result.basicInfo["詳細地址"] && result.basicInfo["詳細地址"] !== "未提供" ? result.basicInfo["詳細地址"] : result.basicInfo["名稱或地址"]) 
      : formData.address;

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
      } else {
        setTravelTime('無法估算');
      }
    } catch (e) {
      setTravelTime('估算失敗');
    } finally {
      setIsLoadingTime(false);
    }
  };

  const handleSave = async () => {
    try {
      const newItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        formData,
        result,
        commuteInfo: (mapDestination && travelTime && travelTime !== '無法估算' && travelTime !== '估算失敗' && travelTime !== '推估中...') ? {
          destination: mapDestination,
          time: travelTime
        } : null
      };
      
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', item: newItem })
      });
      
      if (!res.ok) {
        let errMsg = '儲存失敗，請確認已設定 Vercel KV';
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch(e) {}
        throw new Error(errMsg);
      }
      
      setIsSaved(true);
    } catch (e) {
      console.error('Save failed', e);
      alert(e.message || '儲存至雲端失敗，請稍後再試。');
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <div className={styles.grid}>
          {/* Input Form */}
          <div className={`${styles.formSection} glass-panel`}>
            <h2>房屋資訊</h2>
            <p className={styles.subtitle}>輸入越詳細，AI 分析越準確</p>
            
            <form onSubmit={handleAnalyze} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>房仲網頁網址</label>
                <input type="text" name="url" value={formData.url} onChange={handleChange} placeholder="例: https://sale.591.com.tw/..." />
              </div>
              
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label>社區名稱</label>
                  <input type="text" name="communityName" value={formData.communityName} onChange={handleChange} placeholder="例: 遠雄青青、冠德文心綻" />
                </div>
                <div className={styles.inputGroup}>
                  <label>詳細地址</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="例: 台北市信義區信義路五段..." />
                </div>
              </div>
              
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label>總價 (萬)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="例: 2500" />
                </div>
                <div className={styles.inputGroup}>
                  <label>坪數</label>
                  <input type="number" name="size" value={formData.size} onChange={handleChange} placeholder="例: 35" />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label>屋齡 (年)</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="例: 10" />
                </div>
                <div className={styles.inputGroup}>
                  <label>樓層</label>
                  <input type="text" name="floor" value={formData.floor} onChange={handleChange} placeholder="例: 8F / 15F" />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>物件描述 / 房仲網頁內容</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="貼上房仲網的特色描述，例如：近捷運、三面採光、格局方正..." 
                  rows={5}
                ></textarea>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <><Loader2 className={styles.spinner} /> 分析中...</> : '開始 AI 分析'}
              </button>
            </form>
          </div>

          {/* Result Section */}
          <div className={`${styles.resultSection} glass-panel`}>
            {!result && !loading && !errorMsg && (
              <div className={styles.emptyState}>
                <Lightbulb size={48} className={styles.emptyIcon} />
                <h3>等待分析結果</h3>
                <p>填寫左側資訊並點擊分析，AI 將為您揭示房屋的潛在優劣勢。</p>
              </div>
            )}
            
            {loading && (
              <div className={styles.emptyState}>
                <div className={styles.pulseNode}></div>
                <h3>AI 正在解讀中</h3>
                <p>正在分析地段、格局與市場行情...</p>
              </div>
            )}

            {errorMsg && (
              <div className={styles.emptyState}>
                <AlertTriangle size={48} className={styles.errorIcon} />
                <h3>發生錯誤</h3>
                <p className={styles.errorText}>{errorMsg}</p>
                <p style={{fontSize: '0.85rem', color: '#999'}}>請確認是否已在 .env.local 中設定 GEMINI_API_KEY</p>
              </div>
            )}

            {result && !errorMsg && (
              <div className={`${styles.resultContent} animate-fade-in`}>
                {validImages.length > 0 && (
                  <div className={styles.imageGalleryWrapper}>
                    {validImages.length > 2 && (
                      <button className={styles.galleryArrowLeft} onClick={handlePrevImage} type="button">
                        <ChevronLeft />
                      </button>
                    )}
                    
                    <div className={styles.imageGallery}>
                      {validImages.slice(currentImageIndex, currentImageIndex + 2).map((url, idx) => (
                        <div key={currentImageIndex + idx} className={styles.imageContainer} onClick={() => setLightboxImage(url)}>
                          <img 
                            src={`/api/image?url=${encodeURIComponent(url)}`} 
                            alt={`房屋照片 ${currentImageIndex + idx + 1}`} 
                            className={styles.houseImage} 
                            onError={() => handleImageError(url)}
                          />
                        </div>
                      ))}
                    </div>

                    {validImages.length > 2 && (
                      <button className={styles.galleryArrowRight} onClick={handleNextImage} type="button">
                        <ChevronRight />
                      </button>
                    )}
                  </div>
                )}

                <div className={styles.scoreCard}>
                  <div className={styles.scoreCircle}>
                    <span className={styles.scoreNumber}>{result.score}</span>
                    <span className={styles.scoreLabel}>分</span>
                  </div>
                  <div className={styles.scoreText}>
                    <h3>AI 綜合評分</h3>
                    <p>基於輸入條件的整體評價</p>
                  </div>
                </div>

                {((result.basicInfo && (result.basicInfo["詳細地址"] || result.basicInfo["名稱或地址"]) && result.basicInfo["名稱或地址"] !== "未提供") || (formData.address && !formData.address.startsWith('http'))) && (
                  <div className={styles.mapCard}>
                    <h4 className={styles.cardTitle}><MapPin className={styles.mapIcon} size={20} /> 地理位置與路線規劃</h4>
                    <div className={styles.mapContainer}>
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={(() => {
                          const origin = (result.basicInfo && (result.basicInfo["詳細地址"] || result.basicInfo["名稱或地址"]) && result.basicInfo["名稱或地址"] !== "未提供") 
                            ? (result.basicInfo["詳細地址"] && result.basicInfo["詳細地址"] !== "未提供" ? result.basicInfo["詳細地址"] : result.basicInfo["名稱或地址"]) 
                            : formData.address;
                          
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
                              const origin = (result.basicInfo && (result.basicInfo["詳細地址"] || result.basicInfo["名稱或地址"]) && result.basicInfo["名稱或地址"] !== "未提供") 
                                ? (result.basicInfo["詳細地址"] && result.basicInfo["詳細地址"] !== "未提供" ? result.basicInfo["詳細地址"] : result.basicInfo["名稱或地址"]) 
                                : formData.address;
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

                {result.basicInfo && (
                  <div className={styles.basicInfoCard}>
                    <h4 className={styles.cardTitle}>房屋基本資料</h4>
                    <table className={styles.infoTable}>
                      <tbody>
                        {Object.entries(result.basicInfo).map(([key, value]) => (
                          <tr key={key}>
                            <th className={styles.tableHeader}>{key}</th>
                            <td className={styles.tableData}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {result.priceAnalysis && (
                  <div className={styles.priceAnalysisCard}>
                    <h4 className={styles.cardTitle}><TrendingUp className={styles.priceIcon} /> 實價登錄與行情比對</h4>
                    <div className={styles.priceContent}>
                      <div className={styles.priceHighlight}>
                        <span>區域行情推估：</span>
                        <strong>{result.priceAnalysis.estimatedMarketPrice}</strong>
                      </div>
                      <p>{result.priceAnalysis.comparison}</p>
                    </div>
                  </div>
                )}

                <div className={styles.resultCards}>
                  <div className={`${styles.card} ${styles.prosCard}`}>
                    <h4 className={styles.cardTitle}><CheckCircle2 className={styles.prosIcon} /> 優勢分析</h4>
                    <ul className={styles.list}>
                      {result.pros?.map((pro, idx) => <li key={idx}>{pro}</li>)}
                    </ul>
                  </div>

                  <div className={`${styles.card} ${styles.consCard}`}>
                    <h4 className={styles.cardTitle}><AlertTriangle className={styles.consIcon} /> 劣勢與抗性</h4>
                    <ul className={styles.list}>
                      {result.cons?.map((con, idx) => <li key={idx}>{con}</li>)}
                    </ul>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <h4 className={styles.cardTitle}><Lightbulb className={styles.summaryIcon} /> 購屋建議</h4>
                  <p>{result.summary}</p>
                </div>

                <button 
                  className={styles.saveBtn} 
                  onClick={handleSave}
                  disabled={isSaved}
                  style={isSaved ? { background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#10b981' } : {}}
                >
                  {isSaved ? '✓ 已加入口袋名單' : '加入口袋名單'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {lightboxImage && (
        <div className={styles.lightbox} onClick={() => setLightboxImage(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxImage(null)}>
            <X size={32} />
          </button>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <img src={`/api/image?url=${encodeURIComponent(lightboxImage)}`} alt="房屋全螢幕照片" className={styles.lightboxImg} />
          </div>
        </div>
      )}
    </div>
  );
}
