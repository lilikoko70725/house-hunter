"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Home, ArrowLeft, Trash2, MapPin, DollarSign, Maximize, Calendar, X, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp, Navigation, ExternalLink, Car, Image as ImageIcon, Building, Scale, Loader2, Edit3, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [mapDestination, setMapDestination] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [isLoadingTime, setIsLoadingTime] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [compareIds, setCompareIds] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const closeModal = () => {
    setSelectedItem(null);
    setDestinationInput('');
    setMapDestination('');
    setTravelTime('');
    setIsEditing(false);
    setEditData(null);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    const itemToEdit = JSON.parse(JSON.stringify(selectedItem));
    if (itemToEdit.result && itemToEdit.result.basicInfo && !itemToEdit.result.basicInfo["車位"]) {
      itemToEdit.result.basicInfo["車位"] = "未提供";
    }
    setEditData(itemToEdit);
  };

  const handleSaveEdit = async () => {
    const newItems = savedItems.map(item => item.id === editData.id ? editData : item);
    setSavedItems(newItems);
    setSelectedItem(editData);
    setIsEditing(false);

    try {
      await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item', item: editData })
      });
    } catch (err) {
      console.error("Failed to update item", err);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedItem) return;
    setIsAnalyzing(true);
    
    const analyzeData = {
      ...selectedItem.formData,
      communityName: selectedItem.result.basicInfo?.["社區名稱"] && selectedItem.result.basicInfo["社區名稱"] !== '未提供' ? selectedItem.result.basicInfo["社區名稱"] : selectedItem.formData.communityName,
      address: selectedItem.result.basicInfo?.["詳細地址"] && selectedItem.result.basicInfo["詳細地址"] !== '未提供' ? selectedItem.result.basicInfo["詳細地址"] : (selectedItem.result.basicInfo?.["名稱或地址"] || selectedItem.formData.address),
      price: selectedItem.result.basicInfo?.["總價"]?.replace(/[^\d.]/g, '') || selectedItem.formData.price,
      size: selectedItem.result.basicInfo?.["總坪數"]?.replace(/[^\d.]/g, '') || selectedItem.formData.size,
      age: selectedItem.result.basicInfo?.["屋齡"]?.replace(/[^\d.]/g, '') || selectedItem.formData.age,
      floor: selectedItem.result.basicInfo?.["樓層"] || selectedItem.formData.floor,
      description: (selectedItem.formData.description || '') + 
        (selectedItem.result.basicInfo?.["車位"] && selectedItem.result.basicInfo["車位"] !== '未提供' ? `\n\n[使用者補充車位資訊]: ${selectedItem.result.basicInfo["車位"]}` : '') +
        (selectedItem.note ? `\n\n[使用者補充看屋筆記]: ${selectedItem.note}` : ''),
      url: getPropertyUrl(selectedItem) || selectedItem.formData.url,
      screenshots: selectedItem.formData.screenshots || []
    };

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeData)
      });
      
      const newResult = await res.json();
      
      if (res.ok) {
        const updatedItem = {
          ...selectedItem,
          result: {
            ...newResult,
            basicInfo: {
              ...selectedItem.result.basicInfo, // preserve user edits
              ...newResult.basicInfo
            }
          }
        };
        
        const newItems = savedItems.map(item => item.id === updatedItem.id ? updatedItem : item);
        setSavedItems(newItems);
        setSelectedItem(updatedItem);
        
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_item', item: updatedItem })
        });
        
        alert("重新分析完成！");
      } else {
        alert("重新分析失敗：" + (newResult.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to re-analyze", err);
      alert("重新分析發生錯誤，請稍後再試。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteImage = async (imgSrcToDelete) => {
    // Create new selectedItem
    const updatedItem = { ...selectedItem };
    
    // Check and remove from formData.screenshots
    if (updatedItem.formData?.screenshots) {
      updatedItem.formData.screenshots = updatedItem.formData.screenshots.filter(img => img !== imgSrcToDelete);
    }
    
    // Check and remove from result.imageUrls
    if (updatedItem.result?.imageUrls) {
      updatedItem.result.imageUrls = updatedItem.result.imageUrls.filter(img => img !== imgSrcToDelete);
    }
    
    // Update state
    setSelectedItem(updatedItem);
    const newItems = savedItems.map(item => item.id === updatedItem.id ? updatedItem : item);
    setSavedItems(newItems);
    
    // Save to backend
    try {
      await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item', item: updatedItem })
      });
    } catch (err) {
      console.error("Failed to delete image", err);
    }
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
        
        const updatedItem = { ...selectedItem, commuteInfo: { destination: destinationInput, time: data.time } };
        const updatedItems = savedItems.map(item => item.id === selectedItem.id ? updatedItem : item);
        setSavedItems(updatedItems);
        
        // Save to KV
        fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_commute', item: updatedItem })
        }).catch(err => console.error("Failed to save commute", err));
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
    
    // Fetch items from KV
    fetch('/api/saved')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Check if there is old local data that needs to be migrated to cloud
          const localData = JSON.parse(localStorage.getItem('house_hunter_saved') || '[]');
          if (localData.length > 0) {
            // Optimistically show merged data
            const existingIds = new Set(data.map(i => i.id));
            const itemsToSync = localData.filter(i => !existingIds.has(i.id));
            setSavedItems([...itemsToSync, ...data]);
            
            // Sync to cloud
            fetch('/api/saved', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'sync', localItems: localData })
            })
            .then(res => {
              if (!res.ok) throw new Error('API failed');
              return res.json();
            })
            .then(syncData => {
              if (syncData.items && syncData.success) {
                setSavedItems(syncData.items);
                // ONLY clear local storage after successful sync
                localStorage.removeItem('house_hunter_saved');
              }
            })
            .catch(err => console.error("Error migrating local data:", err));
          } else {
            setSavedItems(data);
          }
        }
      })
      .catch(err => console.error("Error fetching saved items:", err))
      .finally(() => setIsLoadingItems(false));
    
    const cIds = JSON.parse(localStorage.getItem('house_hunter_compare_ids') || '[]');
    setCompareIds(cIds);
  }, []);

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

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent opening the modal
    if (confirm('確定要刪除這筆分析紀錄嗎？')) {
      const newItems = savedItems.filter(item => item.id !== id);
      setSavedItems(newItems); // Optimistic update
      
      try {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id })
        });
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const handleStatusChange = async (e, id, newStatus) => {
    e.stopPropagation();
    const newItems = savedItems.map(item => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    setSavedItems(newItems); // Optimistic update
    
    try {
      await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id, newStatus })
      });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const toggleCompare = (e, id) => {
    e.stopPropagation();
    let newIds = [...compareIds];
    if (newIds.includes(id)) {
      newIds = newIds.filter(i => i !== id);
    } else {
      if (newIds.length >= 3) {
        alert('最多只能同時比較 3 個物件喔！');
        return;
      }
      newIds.push(id);
    }
    setCompareIds(newIds);
    localStorage.setItem('house_hunter_compare_ids', JSON.stringify(newIds));
  };

  if (!isClient) return null; // Avoid hydration mismatch

  const getItemPrice = (item) => {
    const raw = item.formData?.price || item.result?.basicInfo?.["總價"] || '';
    const match = raw.toString().replace(/,/g, '').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const getItemSize = (item) => {
    const raw = item.formData?.size || item.result?.basicInfo?.["總坪數"] || '';
    const match = raw.toString().replace(/,/g, '').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const getItemAge = (item) => {
    const raw = item.formData?.age || item.result?.basicInfo?.["屋齡"] || '';
    const match = raw.toString().replace(/,/g, '').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const getDistrict = (item) => {
    const address = item.result?.basicInfo?.["詳細地址"] || item.formData?.address || item.result?.basicInfo?.["名稱或地址"] || '';
    const match = address.match(/(?:[\u4e00-\u9fa5]{2}[縣市])?([\u4e00-\u9fa5]{1,3}[區鎮鄉])/);
    return match ? match[1] : '';
  };

  const availableDistricts = [...new Set(savedItems.map(getDistrict).filter(Boolean))].sort();

  const filteredItems = savedItems.filter(item => {
    // Status
    if (statusFilter !== 'all' && (item.status || 'to_view') !== statusFilter) return false;
    
    // District
    const district = getDistrict(item);
    if (districtFilter !== 'all' && district !== districtFilter) return false;
    
    // Price
    const price = getItemPrice(item);
    if (priceFilter === 'under_1000' && (price === 0 || price > 1000)) return false;
    if (priceFilter === '1000_2000' && (price < 1000 || price > 2000)) return false;
    if (priceFilter === '2000_3000' && (price < 2000 || price > 3000)) return false;
    if (priceFilter === 'over_3000' && (price === 0 || price <= 3000)) return false;

    // Size
    const size = getItemSize(item);
    if (sizeFilter === 'under_20' && (size === 0 || size > 20)) return false;
    if (sizeFilter === '20_40' && (size < 20 || size > 40)) return false;
    if (sizeFilter === 'over_40' && (size === 0 || size <= 40)) return false;

    // Age
    const age = getItemAge(item);
    if (ageFilter === 'under_5' && (age === 0 || age > 5)) return false;
    if (ageFilter === 'under_10' && (age === 0 || age > 10)) return false;
    if (ageFilter === 'under_20' && (age === 0 || age > 20)) return false;
    if (ageFilter === 'over_20' && (age === 0 || age <= 20)) return false;

    // Score
    const score = item.result?.score || 0;
    if (scoreFilter === 'over_80' && score < 80) return false;
    if (scoreFilter === 'over_90' && score < 90) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt || b.id - a.id;
    if (sortBy === 'score') return (b.result?.score || 0) - (a.result?.score || 0);
    
    if (sortBy === 'price_asc') return getItemPrice(a) - getItemPrice(b);
    if (sortBy === 'price_desc') return getItemPrice(b) - getItemPrice(a);
    if (sortBy === 'size_desc') return getItemSize(b) - getItemSize(a);
    
    return 0;
  });

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        {isLoadingItems ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <Loader2 className={styles.spinner} size={48} />
            <h2>載入中...</h2>
            <p>正在同步您的口袋名單</p>
          </div>
        ) : savedItems.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <h2>目前還沒有儲存的紀錄</h2>
            <p>去分析一些房子，然後把它們加到這裡吧！</p>
            <Link href="/analyze" className={styles.goAnalyzeBtn}>前往 AI 房屋分析</Link>
          </div>
        ) : (
          <>
            <div className={styles.filterContainer}>
              <button 
                className={`${styles.filterTab} ${statusFilter === 'all' ? styles.active : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                全部
              </button>
              <button 
                className={`${styles.filterTab} ${statusFilter === 'to_view' ? styles.active : ''}`}
                onClick={() => setStatusFilter('to_view')}
              >
                待看房
              </button>
              <button 
                className={`${styles.filterTab} ${statusFilter === 'scheduled' ? styles.active : ''}`}
                onClick={() => setStatusFilter('scheduled')}
              >
                已安排
              </button>
              <button 
                className={`${styles.filterTab} ${statusFilter === 'viewed' ? styles.active : ''}`}
                onClick={() => setStatusFilter('viewed')}
              >
                已看房
              </button>
              <button 
                className={`${styles.filterTab} ${statusFilter === 'archived' ? styles.active : ''}`}
                onClick={() => setStatusFilter('archived')}
              >
                已珍藏
              </button>
            </div>
            
            <div className={styles.advancedFilters}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>排序</span>
                <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">最新加入</option>
                  <option value="score">AI 評分 (高到低)</option>
                  <option value="price_asc">總價 (由低到高)</option>
                  <option value="price_desc">總價 (由高到低)</option>
                  <option value="size_desc">坪數 (由大到小)</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>區域</span>
                <select className={styles.filterSelect} value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}>
                  <option value="all">不限</option>
                  {availableDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>總價</span>
                <select className={styles.filterSelect} value={priceFilter} onChange={e => setPriceFilter(e.target.value)}>
                  <option value="all">不限</option>
                  <option value="under_1000">1000萬以下</option>
                  <option value="1000_2000">1000~2000萬</option>
                  <option value="2000_3000">2000~3000萬</option>
                  <option value="over_3000">3000萬以上</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>坪數</span>
                <select className={styles.filterSelect} value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
                  <option value="all">不限</option>
                  <option value="under_20">20坪以下</option>
                  <option value="20_40">20~40坪</option>
                  <option value="over_40">40坪以上</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>屋齡</span>
                <select className={styles.filterSelect} value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
                  <option value="all">不限</option>
                  <option value="under_5">5年內</option>
                  <option value="under_10">10年內</option>
                  <option value="under_20">20年內</option>
                  <option value="over_20">20年以上</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>評分</span>
                <select className={styles.filterSelect} value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}>
                  <option value="all">不限</option>
                  <option value="over_80">80分以上</option>
                  <option value="over_90">90分以上</option>
                </select>
              </div>
            </div>
            {filteredItems.length === 0 ? (
              <div className={`${styles.emptyState} glass-panel`}>
                <h2>找不到符合條件的紀錄</h2>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredItems.map((item) => (
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
                {(() => {
                  const images = getCombinedImages(item);
                  if (images.length > 0) {
                    const firstImg = images[0];
                    const isBase64 = firstImg.startsWith('data:');
                    const imgSrc = isBase64 ? firstImg : `/api/image?url=${encodeURIComponent(firstImg)}`;
                    return (
                      <div className={styles.cardImageContainer}>
                        <img src={imgSrc} alt="房屋照片" className={styles.cardImage} onError={(e) => { !isBase64 && (e.target.style.display = 'none'); }} />
                        <div className={styles.cardHeaderOverlay}>
                          <select 
                            className={styles.statusSelect} 
                            value={item.status || 'to_view'} 
                            onChange={(e) => handleStatusChange(e, item.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="to_view">待看房</option>
                            <option value="scheduled">已安排</option>
                            <option value="viewed">已看房</option>
                            <option value="archived">已珍藏</option>
                          </select>
                          <div className={styles.scoreBadge}>
                            {item.result.score} 分
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={(e) => toggleCompare(e, item.id)} className={`${styles.compareBtn} ${compareIds.includes(item.id) ? styles.active : ''}`} title={compareIds.includes(item.id) ? "移除比較" : "加入比較"}>
                              <Scale size={18} />
                            </button>
                            <button onClick={(e) => handleDelete(e, item.id)} className={styles.deleteBtn} title="刪除紀錄">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.cardHeader}>
                        <select 
                          className={styles.statusSelect} 
                          value={item.status || 'to_view'} 
                          onChange={(e) => handleStatusChange(e, item.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="to_view">待看房</option>
                          <option value="scheduled">已安排</option>
                          <option value="viewed">已看房</option>
                          <option value="archived">已珍藏</option>
                        </select>
                        <div className={styles.scoreBadge}>
                          {item.result.score} 分
                        </div>
                        <button onClick={(e) => handleDelete(e, item.id)} className={styles.deleteBtn} title="刪除紀錄">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  }
                })()}

                <div className={styles.cardBody}>
                  <h3 className={styles.address}>
                    <MapPin size={16} className={styles.icon} /> 
                    <span style={{ flex: 1 }}>{getDisplayName(item)}</span>
                    {getPropertyUrl(item) && (
                      <a href={getPropertyUrl(item)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }} title="前往物件網頁">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </h3>
                  
                  {item.result?.basicInfo?.["社區名稱"] && item.result.basicInfo["社區名稱"] !== '未提供' && item.result.basicInfo["社區名稱"] !== '-' && (
                    <div className={styles.communityName}>
                      <Building size={14} />
                      {item.result.basicInfo["社區名稱"]}
                    </div>
                  )}

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
        </>
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
              <div style={{ flex: 1 }}>
                <h2 className={styles.modalTitle}>
                  <MapPin size={24} className={styles.icon} />
                  {getDisplayName(selectedItem)}
                  {getPropertyUrl(selectedItem) && (
                    <a href={getPropertyUrl(selectedItem)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.5rem', color: '#3b82f6', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem', borderRadius: '8px' }} title="前往物件網頁">
                      <ExternalLink size={20} />
                    </a>
                  )}
                </h2>
                {selectedItem.result?.basicInfo?.["社區名稱"] && selectedItem.result.basicInfo["社區名稱"] !== '未提供' && selectedItem.result.basicInfo["社區名稱"] !== '-' && (
                  <div className={styles.communityName} style={{ justifyContent: 'flex-start', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                    <Building size={18} />
                    {selectedItem.result.basicInfo["社區名稱"]}
                  </div>
                )}
              </div>
              
              {!isEditing && (
                <button 
                  className={styles.reanalyzeBtn} 
                  onClick={handleReanalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 size={18} className={styles.spinner} /> : <RefreshCw size={18} />}
                  <span className={styles.reanalyzeText}>{isAnalyzing ? '分析中...' : '重新分析'}</span>
                </button>
              )}
            </div>

            <div className={styles.modalBody}>
              {/* Image Gallery Section */}
              {(() => {
                const modalImages = getCombinedImages(selectedItem);
                if (modalImages.length > 0) {
                  return (
                    <div className={styles.modalSection}>
                      <h4><ImageIcon size={18} /> 房屋照片 ({modalImages.length} 張)</h4>
                      <div className={styles.imageGallery}>
                        {modalImages.map((imgSrc, idx) => {
                          const isBase64 = imgSrc.startsWith('data:');
                          const finalSrc = isBase64 ? imgSrc : `/api/image?url=${encodeURIComponent(imgSrc)}`;
                          return (
                            <div key={idx} className={styles.galleryImageContainer}>
                              <img src={finalSrc} alt={`房屋照片 ${idx + 1}`} className={styles.galleryImage} onError={(e) => { !isBase64 && (e.target.style.display = 'none'); }} />
                              <button 
                                className={styles.deleteImageBtn} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImage(imgSrc);
                                }}
                                title="刪除照片"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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

              {/* Note Section */}
              {isEditing ? (
                <div className={`${styles.modalSection} ${styles.noteSection}`}>
                  <h4><Edit3 size={18} /> 備註筆記</h4>
                  <textarea 
                    className={styles.editTextarea} 
                    value={editData.note || ''} 
                    onChange={e => setEditData({...editData, note: e.target.value})}
                    placeholder="在這裡寫下您對這間房子的筆記或心得..."
                  />
                </div>
              ) : selectedItem.note ? (
                <div className={`${styles.modalSection} ${styles.noteSection}`}>
                  <h4><Edit3 size={18} /> 備註筆記</h4>
                  <div className={styles.noteText}>{selectedItem.note}</div>
                </div>
              ) : null}

              {/* Basic Info */}
              {selectedItem.result.basicInfo && (
                <div className={styles.modalSection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: 0 }}>房屋基本資料</h4>
                    {!isEditing ? (
                      <button className={styles.editBtn} onClick={handleEditClick}>
                        <Edit3 size={16} /> 編輯資料
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>取消</button>
                        <button className={styles.saveBtn} onClick={handleSaveEdit}>
                          <Save size={16} /> 儲存
                        </button>
                      </div>
                    )}
                  </div>
                  <table className={styles.infoTable}>
                    <tbody>
                      {isEditing ? Object.entries(editData.result.basicInfo).map(([key, value]) => (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>
                            <input 
                              type="text" 
                              className={styles.editInput} 
                              value={value || ''} 
                              onChange={e => setEditData({
                                ...editData, 
                                result: {
                                  ...editData.result,
                                  basicInfo: {
                                    ...editData.result.basicInfo,
                                    [key]: e.target.value
                                  }
                                }
                              })} 
                            />
                          </td>
                        </tr>
                      )) : Object.entries({ ...selectedItem.result.basicInfo, "車位": selectedItem.result.basicInfo["車位"] || "未提供" }).map(([key, value]) => (
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
