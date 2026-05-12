"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Scale, Plus, X, Image as ImageIcon, Crown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ComparePage() {
  const [savedItems, setSavedItems] = useState([]);
  const [compareIds, setCompareIds] = useState([]); // Array of IDs, max 3
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const MAX_COMPARE = 3;

  useEffect(() => {
    setIsClient(true);
    
    fetch('/api/saved')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSavedItems(data);
          // Try to load previously compared IDs
          const storedCompare = JSON.parse(localStorage.getItem('house_hunter_compare_ids') || '[]');
          // Only keep IDs that still exist in savedItems
          const validIds = storedCompare.filter(id => data.some(item => item.id === id));
          setCompareIds(validIds.slice(0, MAX_COMPARE));
        }
      })
      .catch(err => console.error("Error fetching saved items:", err));
  }, []);

  // Update localStorage when compareIds change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('house_hunter_compare_ids', JSON.stringify(compareIds));
    }
  }, [compareIds, isClient]);

  const handleRemove = (idToRemove) => {
    setCompareIds(prev => prev.filter(id => id !== idToRemove));
  };

  const handleSelect = (item) => {
    if (compareIds.includes(item.id)) {
      handleRemove(item.id);
    } else {
      if (compareIds.length < MAX_COMPARE) {
        setCompareIds(prev => [...prev, item.id]);
      } else {
        alert(`最多只能同時比較 ${MAX_COMPARE} 個物件喔！`);
      }
    }
  };

  if (!isClient) return null;

  const compareItems = compareIds.map(id => savedItems.find(item => item.id === id)).filter(Boolean);
  
  // Create slots array (always length MAX_COMPARE)
  const slots = Array(MAX_COMPARE).fill(null).map((_, index) => compareItems[index] || null);

  // Helper to extract numeric values for comparison
  const extractNumber = (str) => {
    if (!str) return null;
    const cleanStr = String(str).replace(/,/g, '');
    const match = cleanStr.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  };

  // Helper to extract property URL safely
  const getPropertyUrl = (item) => {
    if (!item) return null;
    if (item.result?.sourceUrl) return item.result.sourceUrl;
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = (item.formData?.description || '').match(urlRegex) || (item.formData?.address || '').match(urlRegex);
    return match ? match[0] : null;
  };

  // Helper to get a clean display name (prioritize user input, fallback to AI name, avoid raw URLs)
  const getDisplayName = (item) => {
    if (!item) return '房屋分析報告';
    if (item.formData?.address && !item.formData.address.startsWith('http')) {
      return item.formData.address;
    }
    if (item.result?.basicInfo?.["名稱或地址"] && item.result.basicInfo["名稱或地址"] !== '未提供') {
      return item.result.basicInfo["名稱或地址"];
    }
    return '房屋分析報告';
  };

  const getCombinedImages = (item) => {
    if (!item) return [];
    const scraped = item.result?.imageUrls || [];
    const uploaded = item.formData?.screenshots || [];
    return [...uploaded, ...scraped];
  };

  // Helper to find the best indices for a given field
  const getBestIndices = (fieldType) => {
    const values = slots.map(item => {
      if (!item) return null;
      let val;
      switch (fieldType) {
        case 'price':
          val = extractNumber(item.formData?.price || item.result?.basicInfo?.["總價"]);
          break;
        case 'unitPrice':
          val = extractNumber(item.result?.basicInfo?.["單價"]);
          break;
        case 'size':
          val = extractNumber(item.formData?.size || item.result?.basicInfo?.["總坪數"]);
          break;
        case 'age':
          val = extractNumber(item.formData?.age || item.result?.basicInfo?.["屋齡"]);
          break;
        case 'publicRatio':
          val = extractNumber(item.result?.basicInfo?.["公設比"]);
          break;
        case 'commuteTime':
          if (item.commuteInfo?.time && item.commuteInfo.time !== '無法估算' && item.commuteInfo.time !== '估算失敗') {
            val = extractNumber(item.commuteInfo.time);
          }
          break;
        default:
          val = null;
      }
      return val;
    });

    if (values.every(v => v === null)) return [];

    // Define if smaller is better
    const isMinBest = ['price', 'unitPrice', 'age', 'publicRatio', 'commuteTime'].includes(fieldType);
    
    let bestVal = isMinBest ? Infinity : -Infinity;
    values.forEach(v => {
      if (v !== null) {
        if (isMinBest && v < bestVal) bestVal = v;
        if (!isMinBest && v > bestVal) bestVal = v;
      }
    });

    if (bestVal === Infinity || bestVal === -Infinity) return [];
    
    return values.map((v, i) => v === bestVal ? i : -1).filter(i => i !== -1);
  };

  const bestPrice = getBestIndices('price');
  const bestUnitPrice = getBestIndices('unitPrice');
  const bestSize = getBestIndices('size');
  const bestAge = getBestIndices('age');
  const bestPublicRatio = getBestIndices('publicRatio');
  const bestCommute = getBestIndices('commuteTime');

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Scale size={32} />
          </div>
          <h2>統計比較</h2>
          <p className={styles.subtitle}>並排檢視物件條件，挑出最理想的家</p>
        </div>

        <div className={styles.comparisonSection}>
          <table className={styles.compareTable} style={{ '--col-count': MAX_COMPARE }}>
            <thead>
              <tr>
                <th className={styles.labelColumn}></th>
                {slots.map((item, index) => (
                  <th key={`header-${index}`} className={styles.dataColumn}>
                    {item ? (
                      <div className={styles.propertyHeader}>
                        <button className={styles.removeBtn} onClick={() => handleRemove(item.id)} title="移除">
                          <X size={16} />
                        </button>
                        <div className={styles.imageContainer}>
                          {(() => {
                            const images = getCombinedImages(item);
                            if (images.length > 0) {
                              return (
                                <div className={styles.galleryScroll}>
                                  {images.map((imgSrc, idx) => {
                                    const isBase64 = imgSrc.startsWith('data:');
                                    const finalSrc = isBase64 ? imgSrc : `/api/image?url=${encodeURIComponent(imgSrc)}`;
                                    return <img key={idx} src={finalSrc} className={styles.propertyImage} alt={`房屋照片 ${idx + 1}`} onError={(e) => { !isBase64 && (e.target.style.display = 'none'); }} />;
                                  })}
                                </div>
                              );
                            }
                            return <div className={styles.noImage}><ImageIcon size={32} /></div>;
                          })()}
                          <div className={styles.scoreBadge}>{item.result?.score || 0} 分</div>
                        </div>
                        <div className={styles.address}>
                          {getPropertyUrl(item) ? (
                            <a href={getPropertyUrl(item)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {getDisplayName(item)}
                              <ExternalLink size={14} style={{ flexShrink: 0 }} />
                            </a>
                          ) : (
                            getDisplayName(item)
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.emptySlot} onClick={() => setIsModalOpen(true)}>
                        <Plus size={32} />
                        <span>加入物件</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            
            {compareItems.length > 0 && (
              <tbody>
                <tr>
                  <th className={styles.labelColumn}>社區名稱</th>
                  {slots.map((item, index) => (
                    <td key={`community-${index}`} className={styles.dataColumn}>
                      {item ? (item.result?.basicInfo?.["社區名稱"] || '-') : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>總價</th>
                  {slots.map((item, index) => (
                    <td key={`price-${index}`} className={`${styles.dataColumn} ${bestPrice.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <span className={styles.price}>{item.formData?.price ? `${item.formData.price} 萬` : (item.result?.basicInfo?.["總價"] || '-')}</span>
                          {bestPrice.includes(index) && <Crown className={styles.crownIcon} size={18} />}
                        </div>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>單價</th>
                  {slots.map((item, index) => (
                    <td key={`unit-price-${index}`} className={`${styles.dataColumn} ${bestUnitPrice.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <span>{item.result?.basicInfo?.["單價"] || '-'}</span>
                          {bestUnitPrice.includes(index) && <Crown className={styles.crownIcon} size={18} />}
                        </div>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>坪數 / 格局</th>
                  {slots.map((item, index) => (
                    <td key={`size-${index}`} className={`${styles.dataColumn} ${bestSize.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <div>
                            <div>{item.formData?.size ? `${item.formData.size} 坪` : (item.result?.basicInfo?.["總坪數"] || '-')}</div>
                            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px'}}>{item.result?.basicInfo?.["格局"] || '-'}</div>
                          </div>
                          {bestSize.includes(index) && <Crown className={styles.crownIcon} size={18} />}
                        </div>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>屋齡 / 樓層</th>
                  {slots.map((item, index) => (
                    <td key={`age-${index}`} className={`${styles.dataColumn} ${bestAge.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <div>
                            <div>{item.formData?.age ? `${item.formData.age} 年` : (item.result?.basicInfo?.["屋齡"] || '-')}</div>
                            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px'}}>{item.formData?.floor || item.result?.basicInfo?.["樓層"] || '-'}</div>
                          </div>
                          {bestAge.includes(index) && <Crown className={styles.crownIcon} size={18} />}
                        </div>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>行政區</th>
                  {slots.map((item, index) => {
                    if (!item) return <td key={`district-${index}`} className={styles.dataColumn}>-</td>;
                    const address = item.result?.basicInfo?.["詳細地址"] || item.formData?.address || item.result?.basicInfo?.["名稱或地址"] || '';
                    const match = address.match(/(.{2,3}[市縣])?(.{2,3}[區市鎮鄉])/);
                    return <td key={`district-${index}`} className={styles.dataColumn}>{match ? match[0] : '-'}</td>;
                  })}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>型態 / 用途</th>
                  {slots.map((item, index) => (
                    <td key={`type-${index}`} className={styles.dataColumn}>
                      {item ? (item.result?.basicInfo?.["型態/用途"] || '-') : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>公設比</th>
                  {slots.map((item, index) => (
                    <td key={`public-ratio-${index}`} className={`${styles.dataColumn} ${bestPublicRatio.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <span>{item.result?.basicInfo?.["公設比"] || '-'}</span>
                          {bestPublicRatio.includes(index) && <Crown className={styles.crownIcon} size={18} />}
                        </div>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>最近捷運站</th>
                  {slots.map((item, index) => (
                    <td key={`mrt-${index}`} className={styles.dataColumn}>
                      {item ? (item.result?.basicInfo?.["最近捷運站"] || '-') : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>自訂通勤時間</th>
                  {slots.map((item, index) => (
                    <td key={`custom-commute-${index}`} className={`${styles.dataColumn} ${bestCommute.includes(index) && item?.commuteInfo ? styles.bestCell : ''}`}>
                      {item ? (
                        item.commuteInfo ? (
                          <div className={styles.cellContent}>
                            <div>
                              <div style={{fontWeight: 600, color: 'var(--text-main)'}}>{item.commuteInfo.destination}</div>
                              <div style={{color: '#10b981', marginTop: '4px'}}>{item.commuteInfo.time}</div>
                            </div>
                            {bestCommute.includes(index) && <Crown className={styles.crownIcon} size={18} />}
                          </div>
                        ) : '-'
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>AI 購屋建議</th>
                  {slots.map((item, index) => (
                    <td key={`summary-${index}`} className={styles.dataColumn}>
                      {item ? (item.result?.summary || '-') : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>優點 (Pros)</th>
                  {slots.map((item, index) => (
                    <td key={`pros-${index}`} className={styles.dataColumn}>
                      {item ? (
                        <ul className={styles.list}>
                          {item.result?.pros?.map((pro, idx) => <li key={idx} className={styles.prosItem}>{pro}</li>)}
                        </ul>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>抗性 (Cons)</th>
                  {slots.map((item, index) => (
                    <td key={`cons-${index}`} className={styles.dataColumn}>
                      {item ? (
                        <ul className={styles.list}>
                          {item.result?.cons?.map((con, idx) => <li key={idx} className={styles.consItem}>{con}</li>)}
                        </ul>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </main>

      {/* Select Item Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>從口袋名單選擇物件 (最多 {MAX_COMPARE} 個)</h3>
              <button className={styles.modalClose} onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {savedItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>您的口袋名單目前沒有物件喔！</p>
                  <Link href="/analyze" style={{color: '#3b82f6', marginTop: '1rem', display: 'inline-block'}}>去分析一些房子吧</Link>
                </div>
              ) : (
                <>
                  {(() => {
                    const toViewItems = savedItems.filter(i => (i.status || 'to_view') === 'to_view');
                    const scheduledItems = savedItems.filter(i => i.status === 'scheduled');
                    const viewedItems = savedItems.filter(i => i.status === 'viewed');
                    const archivedItems = savedItems.filter(i => i.status === 'archived');

                    const renderItem = (item) => {
                      const images = getCombinedImages(item);
                      return (
                        <div 
                          key={item.id} 
                          className={`${styles.savedItemCard} ${compareIds.includes(item.id) ? styles.selected : ''}`}
                          onClick={() => handleSelect(item)}
                        >
                          {images.length > 0 ? (
                            <img src={images[0].startsWith('data:') ? images[0] : `/api/image?url=${encodeURIComponent(images[0])}`} className={styles.modalItemImage} alt="房屋照片" onError={(e) => { !images[0].startsWith('data:') && (e.target.style.display = 'none'); }} />
                          ) : (
                            <div className={styles.modalItemImage} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)'}}>
                              <ImageIcon size={24} color="var(--text-muted)" />
                            </div>
                          )}
                          <div className={styles.modalItemInfo}>
                            <div className={styles.modalItemAddress}>{getDisplayName(item)}</div>
                            <div className={styles.modalItemTags}>
                              <span>{item.formData?.price ? `${item.formData.price} 萬` : ''}</span>
                              <span>{item.formData?.size ? `${item.formData.size} 坪` : ''}</span>
                            </div>
                          </div>
                          <div className={styles.modalItemScore}>{item.result?.score || 0} 分</div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {toViewItems.length > 0 && (
                          <div className={styles.categorySection}>
                            <h4 className={styles.categoryTitle}>待看房 ({toViewItems.length})</h4>
                            {toViewItems.map(renderItem)}
                          </div>
                        )}
                        {scheduledItems.length > 0 && (
                          <div className={styles.categorySection}>
                            <h4 className={styles.categoryTitle}>已安排 ({scheduledItems.length})</h4>
                            {scheduledItems.map(renderItem)}
                          </div>
                        )}
                        {viewedItems.length > 0 && (
                          <div className={styles.categorySection}>
                            <h4 className={styles.categoryTitle}>已看房 ({viewedItems.length})</h4>
                            {viewedItems.map(renderItem)}
                          </div>
                        )}
                        {archivedItems.length > 0 && (
                          <div className={styles.categorySection}>
                            <h4 className={styles.categoryTitle}>已珍藏 ({archivedItems.length})</h4>
                            {archivedItems.map(renderItem)}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
