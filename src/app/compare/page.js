"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Scale, Plus, X, Image as ImageIcon, Crown } from 'lucide-react';
import Link from 'next/link';

export default function ComparePage() {
  const [savedItems, setSavedItems] = useState([]);
  const [compareIds, setCompareIds] = useState([]); // Array of IDs, max 3
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const MAX_COMPARE = 3;

  useEffect(() => {
    setIsClient(true);
    const items = JSON.parse(localStorage.getItem('house_hunter_saved') || '[]');
    setSavedItems(items);
    
    // Try to load previously compared IDs
    const storedCompare = JSON.parse(localStorage.getItem('house_hunter_compare_ids') || '[]');
    // Only keep IDs that still exist in savedItems
    const validIds = storedCompare.filter(id => items.some(item => item.id === id));
    setCompareIds(validIds.slice(0, MAX_COMPARE));
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

  // Helper to find the best indices for a given field
  const getBestIndices = (fieldType) => {
    const values = slots.map(item => {
      if (!item) return null;
      let val;
      switch (fieldType) {
        case 'price':
          val = extractNumber(item.formData.price || item.result.basicInfo?.["總價"]);
          break;
        case 'unitPrice':
          val = extractNumber(item.result.basicInfo?.["單價"]);
          break;
        case 'size':
          val = extractNumber(item.formData.size || item.result.basicInfo?.["總坪數"]);
          break;
        case 'age':
          val = extractNumber(item.formData.age || item.result.basicInfo?.["屋齡"]);
          break;
        case 'publicRatio':
          val = extractNumber(item.result.basicInfo?.["公設比"]);
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
                          {item.result.imageUrls && item.result.imageUrls.length > 0 ? (
                            <img src={`/api/image?url=${encodeURIComponent(item.result.imageUrls[0])}`} className={styles.propertyImage} alt="房屋照片" />
                          ) : (
                            <div className={styles.noImage}><ImageIcon size={32} /></div>
                          )}
                          <div className={styles.scoreBadge}>{item.result.score} 分</div>
                        </div>
                        <div className={styles.address}>
                          {item.formData.address || item.result.basicInfo?.["名稱或地址"]}
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
                  <th className={styles.labelColumn}>總價</th>
                  {slots.map((item, index) => (
                    <td key={`price-${index}`} className={`${styles.dataColumn} ${bestPrice.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <span className={styles.price}>{item.formData.price ? `${item.formData.price} 萬` : (item.result.basicInfo?.["總價"] || '-')}</span>
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
                          <span>{item.result.basicInfo?.["單價"] || '-'}</span>
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
                            <div>{item.formData.size ? `${item.formData.size} 坪` : (item.result.basicInfo?.["總坪數"] || '-')}</div>
                            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px'}}>{item.result.basicInfo?.["格局"] || '-'}</div>
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
                            <div>{item.formData.age ? `${item.formData.age} 年` : (item.result.basicInfo?.["屋齡"] || '-')}</div>
                            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px'}}>{item.formData.floor || item.result.basicInfo?.["樓層"] || '-'}</div>
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
                    const address = item.result.basicInfo?.["詳細地址"] || item.formData.address || item.result.basicInfo?.["名稱或地址"] || '';
                    const match = address.match(/(.{2,3}[市縣])?(.{2,3}[區市鎮鄉])/);
                    return <td key={`district-${index}`} className={styles.dataColumn}>{match ? match[0] : '-'}</td>;
                  })}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>型態 / 用途</th>
                  {slots.map((item, index) => (
                    <td key={`type-${index}`} className={styles.dataColumn}>
                      {item ? (item.result.basicInfo?.["型態/用途"] || '-') : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>公設比</th>
                  {slots.map((item, index) => (
                    <td key={`public-ratio-${index}`} className={`${styles.dataColumn} ${bestPublicRatio.includes(index) ? styles.bestCell : ''}`}>
                      {item ? (
                        <div className={styles.cellContent}>
                          <span>{item.result.basicInfo?.["公設比"] || '-'}</span>
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
                      {item ? (item.result.basicInfo?.["最近捷運站"] || '-') : '-'}
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
                      {item ? item.result.summary : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.labelColumn}>優點 (Pros)</th>
                  {slots.map((item, index) => (
                    <td key={`pros-${index}`} className={styles.dataColumn}>
                      {item ? (
                        <ul className={styles.list}>
                          {item.result.pros?.map((pro, idx) => <li key={idx} className={styles.prosItem}>{pro}</li>)}
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
                          {item.result.cons?.map((con, idx) => <li key={idx} className={styles.consItem}>{con}</li>)}
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
                savedItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`${styles.savedItemCard} ${compareIds.includes(item.id) ? styles.selected : ''}`}
                    onClick={() => handleSelect(item)}
                  >
                    {item.result.imageUrls && item.result.imageUrls.length > 0 ? (
                      <img src={`/api/image?url=${encodeURIComponent(item.result.imageUrls[0])}`} className={styles.modalItemImage} alt="房屋照片" />
                    ) : (
                      <div className={styles.modalItemImage} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)'}}>
                        <ImageIcon size={24} color="var(--text-muted)" />
                      </div>
                    )}
                    <div className={styles.modalItemInfo}>
                      <div className={styles.modalItemAddress}>{item.formData.address || item.result.basicInfo?.["名稱或地址"]}</div>
                      <div className={styles.modalItemTags}>
                        <span>{item.formData.price ? `${item.formData.price} 萬` : ''}</span>
                        <span>{item.formData.size ? `${item.formData.size} 坪` : ''}</span>
                      </div>
                    </div>
                    <div className={styles.modalItemScore}>{item.result.score} 分</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
