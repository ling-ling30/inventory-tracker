"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  StatusPill,
  TagCode,
  FieldBadge,
  Avatar,
  UserPill,
  Toast,
  EmptyState,
  PageHeader,
  FormField,
  FormSection,
  FormActions,
  SearchBar,
  ExportDropdown,
  SegmentedControl,
  HandoverTimeline,
  InfoBlock,
  SpecGrid,
} from '@/components/ui';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: string;
}

interface Category {
  id: string;
  name: string;
  code_prefix: string;
  fields: CategoryField[];
}

interface User {
  id: string;
  user_name: string;
  job_title: string;
  department?: string;
}

interface HandoverHistoryItem {
  id: string;
  date: string;
  from: string;
  to: string;
  notes?: string;
}

interface Item {
  id: string;
  assetTag: string;
  category: string;
  status: string;
  assignedUserId?: string | null;
  location?: string;
  notes?: string;
  details?: Record<string, any>;
  assignedUserName?: string;
  history?: HandoverHistoryItem[];
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function InventoryApp() {
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Navigation
  const [activeScreen, setActiveScreen] = useState<string>('items');

  // Filters
  const [currentCategoryFilter, setCurrentCategoryFilter] = useState('ALL');
  const [currentStatusFilter, setCurrentStatusFilter] = useState('ALL');
  const [currentPeopleFilter, setCurrentPeopleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsViewMode, setItemsViewMode] = useState<'table' | 'cards'>('table');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Selections
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Item form
  const [itemFormId, setItemFormId] = useState<string | null>(null);
  const [itemFormCategory, setItemFormCategory] = useState<string>('');
  const [itemFormTag, setItemFormTag] = useState('');
  const [itemFormStatus, setItemFormStatus] = useState('Available');
  const [itemFormAssignee, setItemFormAssignee] = useState('');
  const [itemFormLocation, setItemFormLocation] = useState('');
  const [itemFormNotes, setItemFormNotes] = useState('');
  const [itemFormDetails, setItemFormDetails] = useState<Record<string, any>>({});

  // Handover form
  const [handoverToUser, setHandoverToUser] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Person form
  const [personFormId, setPersonFormId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [personTitle, setPersonTitle] = useState('');
  const [personDept, setPersonDept] = useState('');

  // Category form
  const [catName, setCatName] = useState('');
  const [catPrefix, setCatPrefix] = useState('');
  const [catFields, setCatFields] = useState<CategoryField[]>([]);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  async function loadData() {
    try {
      setLoading(true);
      const [catsRes, usersRes, itemsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/users'),
        fetch('/api/items'),
      ]);
      const catsData = await catsRes.json();
      const usersData = await usersRes.json();
      const itemsData = await itemsRes.json();
      if (catsData.categories) setCategories(catsData.categories);
      if (usersData.users) setUsers(usersData.users);
      if (itemsData.items) setItems(itemsData.items);
    } catch {
      showToast('Error connecting to database');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // ─── Derived State ─────────────────────────────────────────────────────────

  const mainTab = useMemo(() => {
    if (['items', 'item-form', 'item-detail', 'item-handover'].includes(activeScreen)) return 'items';
    if (['people', 'person-form', 'person-detail'].includes(activeScreen)) return 'people';
    if (['categories', 'category-form'].includes(activeScreen)) return 'categories';
    return 'items';
  }, [activeScreen]);

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedItemId) || null, [items, selectedItemId]);
  const selectedPerson = useMemo(() => users.find((u) => u.id === selectedPersonId) || null, [users, selectedPersonId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (currentCategoryFilter !== 'ALL' && item.category !== currentCategoryFilter) return false;
      if (currentStatusFilter !== 'ALL' && item.status !== currentStatusFilter) return false;
      if (currentPeopleFilter === 'ASSIGNED' && !item.assignedUserId) return false;
      if (currentPeopleFilter === 'UNASSIGNED' && item.assignedUserId) return false;
      if (currentPeopleFilter.startsWith('USR_') && item.assignedUserId !== currentPeopleFilter.replace('USR_', '')) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const u = users.find((usr) => usr.id === item.assignedUserId);
        const detailsStr = Object.values(item.details || {}).join(' ').toLowerCase();
        const match =
          item.assetTag.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.location?.toLowerCase().includes(q)) ||
          (item.notes?.toLowerCase().includes(q)) ||
          (u?.user_name.toLowerCase().includes(q)) ||
          detailsStr.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, users, currentCategoryFilter, currentStatusFilter, currentPeopleFilter, searchQuery]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getItemTitle(item: Item) {
    const d = item.details || {};
    if (item.category === 'Laptop') return d.brand || 'Laptop';
    if (item.category === 'General') return d.item || 'General Item';
    if (item.category === 'Phone') return d.brand || 'Phone';
    if (item.category === 'Provider') return d.provider_name || 'Service';
    return String(Object.values(d)[0] || item.assetTag);
  }

  function suggestTagForCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    const prefix = cat ? cat.code_prefix : 'AST';
    const sameCat = items.filter((i) => i.category === catId);
    return `${prefix}-${(sameCat.length + 1).toString().padStart(3, '0')}`;
  }

  // ─── Navigation Handlers ───────────────────────────────────────────────────

  function handleTabSwitch(tab: 'items' | 'people' | 'categories') {
    setActiveScreen(tab);
    setSearchQuery('');
  }

  function goToItem(id: string) {
    setSelectedItemId(id);
    setActiveScreen('item-detail');
  }

  function goToPerson(id: string) {
    setSelectedPersonId(id);
    setActiveScreen('person-detail');
  }

  // ─── Item CRUD ─────────────────────────────────────────────────────────────

  function handleOpenNewItem() {
    const defaultCat = categories[0]?.id || '';
    setItemFormId(null);
    setItemFormCategory(defaultCat);
    setItemFormTag(suggestTagForCategory(defaultCat));
    setItemFormStatus('Available');
    setItemFormAssignee('');
    setItemFormLocation('');
    setItemFormNotes('');
    setItemFormDetails({});
    setActiveScreen('item-form');
  }

  function handleOpenEditItem(item: Item) {
    setItemFormId(item.id);
    setItemFormCategory(item.category);
    setItemFormTag(item.assetTag);
    setItemFormStatus(item.status);
    setItemFormAssignee(item.assignedUserId || '');
    setItemFormLocation(item.location || '');
    setItemFormNotes(item.notes || '');
    setItemFormDetails(item.details || {});
    setActiveScreen('item-form');
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemFormTag.trim()) return;
    try {
      const payload = {
        assetTag: itemFormTag.trim(),
        category: itemFormCategory,
        status: itemFormStatus,
        assignedUserId: itemFormAssignee || null,
        location: itemFormLocation,
        notes: itemFormNotes,
        details: itemFormDetails,
      };
      if (itemFormId) {
        const res = await fetch(`/api/items/${itemFormId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to update item');
        showToast('Item saved');
      } else {
        const res = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to create item');
        showToast('Item added');
      }
      await loadData();
      setActiveScreen('items');
    } catch (err: any) {
      alert(err.message || 'Save error');
    }
  }

  async function handleDeleteItem(id: string, tag: string) {
    if (!confirm(`Delete "${tag}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      showToast('Item deleted');
      await loadData();
      setActiveScreen('items');
    } catch (err: any) { alert(err.message || 'Delete error'); }
  }

  // ─── Handover ──────────────────────────────────────────────────────────────

  function handleOpenHandover(item: Item) {
    setSelectedItemId(item.id);
    setHandoverToUser('');
    setHandoverNotes('');
    setActiveScreen('item-handover');
  }

  async function handleSubmitHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId) return;
    try {
      const res = await fetch(`/api/items/${selectedItemId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: handoverToUser || null, notes: handoverNotes }),
      });
      if (!res.ok) throw new Error('Failed to record handover');
      const data = await res.json();
      showToast(`Handed over to ${data.toName}`);
      await loadData();
      setActiveScreen('item-detail');
    } catch (err: any) { alert(err.message || 'Handover error'); }
  }

  async function handleQuickUnassign(itemId: string) {
    try {
      const res = await fetch(`/api/items/${itemId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: null, notes: 'Unassigned & returned to storage' }),
      });
      if (!res.ok) throw new Error('Failed to unassign');
      showToast('Item unassigned');
      await loadData();
    } catch (err: any) { alert(err.message || 'Unassign error'); }
  }

  // ─── People CRUD ───────────────────────────────────────────────────────────

  function handleOpenNewPerson() {
    setPersonFormId(null); setPersonName(''); setPersonTitle(''); setPersonDept('');
    setActiveScreen('person-form');
  }

  function handleOpenEditPerson(u: User) {
    setPersonFormId(u.id); setPersonName(u.user_name); setPersonTitle(u.job_title); setPersonDept(u.department || '');
    setActiveScreen('person-form');
  }

  async function handleSavePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || !personTitle.trim()) return;
    try {
      const payload = { userName: personName.trim(), jobTitle: personTitle.trim(), department: personDept.trim() || 'General' };
      if (personFormId) {
        const res = await fetch(`/api/users/${personFormId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to update person');
        showToast(`Saved ${personName}`);
      } else {
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to create person');
        showToast(`Added ${personName}`);
      }
      await loadData();
      setActiveScreen('people');
    } catch (err: any) { alert(err.message || 'Save error'); }
  }

  async function handleDeletePerson(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Their items will be unassigned.`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete person');
      showToast('Person removed');
      await loadData();
      setActiveScreen('people');
    } catch (err: any) { alert(err.message || 'Delete error'); }
  }

  // ─── Category CRUD ─────────────────────────────────────────────────────────

  function handleOpenNewCategory() {
    setEditingCategoryId(null); setCatName(''); setCatPrefix('');
    setCatFields([{ key: 'brand', label: 'Brand & Model', type: 'text', required: true }]);
    setActiveScreen('category-form');
  }

  function handleOpenEditCategory(cat: Category) {
    setEditingCategoryId(cat.id); setCatName(cat.name); setCatPrefix(cat.code_prefix);
    setCatFields(cat.fields ? [...cat.fields] : []);
    setActiveScreen('category-form');
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim() || !catPrefix.trim()) return;
    try {
      const payload = { name: catName.trim(), codePrefix: catPrefix.trim().toUpperCase(), fields: catFields };
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to save category');
      showToast(`Saved ${catName}`);
      await loadData();
      setActiveScreen('categories');
    } catch (err: any) { alert(err.message || 'Category error'); }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? All items in this category will also be removed.`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      showToast('Category deleted');
      await loadData();
      setActiveScreen('categories');
    } catch (err: any) { alert(err.message || 'Delete error'); }
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  function getTodayString() { return new Date().toISOString().split('T')[0]; }
  function sanitizeCell(val: any) { return String(val ?? '').replace(/\r?\n|\r/g, ' ').trim(); }

  function downloadCSV(rows: string[][], filename: string, msg: string) {
    const content = '\uFEFF' + rows.map((r) => r.map((c) => `"${sanitizeCell(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' })),
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setExportMenuOpen(false);
    showToast(msg);
  }

  function exportCurrentView() {
    if (!filteredItems.length) { alert('No items to export.'); return; }
    const today = getTodayString();
    if (currentCategoryFilter !== 'ALL') {
      const cat = categories.find((c) => c.id === currentCategoryFilter);
      const fields = cat?.fields || [];
      const headers = ['Asset Tag', 'Category', ...fields.map((f) => f.label), 'Status', 'Assigned To', 'Job Title', 'Department', 'Location', 'Notes', 'Last Transfer Date', 'Last Transfer From'];
      const rows = [headers, ...filteredItems.map((item) => {
        const u = users.find((usr) => usr.id === item.assignedUserId);
        const lt = item.history?.[0];
        return [item.assetTag, item.category, ...fields.map((f) => item.details?.[f.key] || ''), item.status, u?.user_name || 'Unassigned', u?.job_title || '', u?.department || 'General', item.location || '', item.notes || '', lt?.date || '', lt?.from || ''];
      })];
      downloadCSV(rows, `ga_inventory_${currentCategoryFilter.toLowerCase()}_${today}.csv`, `Exported ${filteredItems.length} items`);
    } else {
      const fieldMap = new Map<string, string>();
      categories.forEach((c) => (c.fields || []).forEach((f) => { if (!fieldMap.has(f.key)) fieldMap.set(f.key, f.label); }));
      const fieldKeys = Array.from(fieldMap.keys());
      const fieldLabels = Array.from(fieldMap.values());
      const headers = ['Asset Tag', 'Category', 'Description', ...fieldLabels, 'Status', 'Assigned To', 'Job Title', 'Department', 'Location', 'Notes'];
      const rows = [headers, ...filteredItems.map((item) => {
        const u = users.find((usr) => usr.id === item.assignedUserId);
        return [item.assetTag, item.category, getItemTitle(item), ...fieldKeys.map((k) => item.details?.[k] || ''), item.status, u?.user_name || 'Unassigned', u?.job_title || '', u?.department || 'General', item.location || '', item.notes || ''];
      })];
      downloadCSV(rows, `ga_inventory_view_${today}.csv`, `Exported ${filteredItems.length} items`);
    }
  }

  function exportMasterInventory() {
    if (!items.length) { alert('No items to export.'); return; }
    const today = getTodayString();
    const fieldMap = new Map<string, string>();
    categories.forEach((c) => (c.fields || []).forEach((f) => { if (!fieldMap.has(f.key)) fieldMap.set(f.key, f.label); }));
    const fieldKeys = Array.from(fieldMap.keys());
    const fieldLabels = Array.from(fieldMap.values());
    const headers = ['Asset Tag', 'Category', 'Description', 'Status', 'Assigned To', 'Job Title', 'Department', ...fieldLabels, 'Location', 'Notes', 'Total Transfers', 'Last Transfer Date', 'Last Transfer From'];
    const rows = [headers, ...items.map((item) => {
      const u = users.find((usr) => usr.id === item.assignedUserId);
      const history = item.history || [];
      const lt = history[0];
      return [item.assetTag, item.category, getItemTitle(item), item.status, u?.user_name || 'Unassigned', u?.job_title || '', u?.department || 'General', ...fieldKeys.map((k) => item.details?.[k] || ''), item.location || '', item.notes || '', String(history.length), lt?.date || '', lt?.from || ''];
    })];
    downloadCSV(rows, `ga_master_inventory_${today}.csv`, `Exported all ${items.length} items`);
  }

  async function exportHandoverLedger() {
    try {
      const data = await fetch('/api/handover-logs').then((r) => r.json());
      const logs = data.logs || [];
      if (!logs.length) { alert('No handover logs yet.'); return; }
      const headers = ['Transfer Date', 'Asset Tag', 'Item Description', 'Category', 'Transferred From', 'Transferred To', 'Status', 'Notes'];
      const rows = [headers, ...logs.map((l: any) => [l.date, l.assetTag, l.itemTitle, l.category, l.from, l.to, l.status, l.notes])];
      downloadCSV(rows, `ga_handover_ledger_${getTodayString()}.csv`, `Exported ${logs.length} transfers`);
    } catch { alert('Failed to export handover log'); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)', fontSize: 14 }}>
        Loading inventory…
      </div>
    );
  }

  return (
    <>
      <Toast message={toastMsg} />

      {/* ── Top Header ── */}
      <header className="nav-header">
        <div className="header-content">
          <div className="app-title-group" onClick={() => handleTabSwitch('items')}>
            <div className="app-logo">GA</div>
            <h1 className="app-title">Inventory</h1>
          </div>

          <div className="header-controls">
            <ExportDropdown
              isOpen={exportMenuOpen}
              onToggle={() => setExportMenuOpen(!exportMenuOpen)}
              onClose={() => setExportMenuOpen(false)}
              options={[
                { label: 'Current View', badge: `${filteredItems.length} items`, description: 'Export items matching active search & filters', onClick: exportCurrentView },
                { label: 'All Inventory (Master)', badge: `${items.length} items`, description: 'All categories with dedicated attribute columns', onClick: exportMasterInventory },
                { label: 'Handover Transfer Log', badge: 'Ledger', description: 'Chronological history of all asset movements', onClick: exportHandoverLedger, separator: true },
              ]}
            />

            {mainTab === 'items' && (
              <Button variant="primary" onClick={handleOpenNewItem}>+ Add Item</Button>
            )}
            {mainTab === 'people' && (
              <Button variant="primary" onClick={handleOpenNewPerson}>+ Add Person</Button>
            )}
            {mainTab === 'categories' && (
              <Button variant="primary" onClick={handleOpenNewCategory}>+ Add Category</Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">

        {/* ── Segmented Tabs ── */}
        {['items', 'people', 'categories'].includes(activeScreen) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <SegmentedControl
              active={mainTab}
              onChange={(key) => handleTabSwitch(key as any)}
              options={[
                { key: 'items', label: 'Items', count: items.length },
                { key: 'people', label: 'People', count: users.length },
                { key: 'categories', label: 'Categories', count: categories.length },
              ]}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 1 — ITEMS LIST
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'items' && (
          <section className="page-view active">
            {/* Category Pills */}
            <div className="category-pills">
              <button
                className={`cat-pill ${currentCategoryFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setCurrentCategoryFilter('ALL')}
              >
                All <span className="pill-number">{items.length}</span>
              </button>
              {categories.map((c) => {
                const count = items.filter((i) => i.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    className={`cat-pill ${currentCategoryFilter === c.id ? 'active' : ''}`}
                    onClick={() => setCurrentCategoryFilter(c.id)}
                  >
                    {c.name} <span className="pill-number">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Filter Bar */}
            <div className="action-bar">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search items, tags, or assignees…"
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="filter-select" value={currentStatusFilter} onChange={(e) => setCurrentStatusFilter(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  <option value="In Use">In Use</option>
                  <option value="Available">Available</option>
                  <option value="In Storage">In Storage</option>
                  <option value="Needs Repair">Needs Repair</option>
                </select>
                <select className="filter-select" value={currentPeopleFilter} onChange={(e) => setCurrentPeopleFilter(e.target.value)}>
                  <option value="ALL">All People</option>
                  <option value="ASSIGNED">Assigned Only</option>
                  <option value="UNASSIGNED">Unassigned Only</option>
                  {users.map((u) => <option key={u.id} value={`USR_${u.id}`}>{u.user_name}</option>)}
                </select>
                <Button variant="ghost" size="sm" onClick={() => setItemsViewMode(itemsViewMode === 'table' ? 'cards' : 'table')}>
                  {itemsViewMode === 'table' ? 'Cards' : 'Table'}
                </Button>
              </div>
            </div>

            {/* Table View */}
            {itemsViewMode === 'table' && (
              <div className="content-card">
                <div className="table-container">
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Tag</th>
                        <th>Category</th>
                        <th>Details</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const u = users.find((usr) => usr.id === item.assignedUserId);
                        return (
                          <tr key={item.id}>
                            <td><TagCode onClick={() => goToItem(item.id)}>{item.assetTag}</TagCode></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.category}</td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => goToItem(item.id)}>
                                {getItemTitle(item)}
                              </div>
                            </td>
                            <td>
                              {u ? (
                                <UserPill name={u.user_name} onClick={() => goToPerson(u.id)} />
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>—</span>
                              )}
                            </td>
                            <td><StatusPill status={item.status} /></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.location || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenHandover(item)}>Handover</Button>
                                <Button variant="ghost" size="sm" onClick={() => goToItem(item.id)}>View</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenEditItem(item)}>Edit</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredItems.length === 0 && (
                  <EmptyState
                    title="No items found"
                    description="Try a different search or filter, or add a new item."
                    actionLabel="+ Add Item"
                    onAction={handleOpenNewItem}
                  />
                )}
              </div>
            )}

            {/* Cards View */}
            {itemsViewMode === 'cards' && (
              <div className="cards-grid">
                {filteredItems.map((item) => {
                  const u = users.find((usr) => usr.id === item.assignedUserId);
                  return (
                    <div key={item.id} className="item-card" onClick={() => goToItem(item.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <TagCode>{item.assetTag}</TagCode>
                        <StatusPill status={item.status} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{getItemTitle(item)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        {item.category} • {item.location || 'No location'}
                      </div>
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {u ? u.user_name : 'In Storage'}
                        </span>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenHandover(item); }}>
                          Handover
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <EmptyState title="No items found" description="Try a different filter." actionLabel="+ Add Item" onAction={handleOpenNewItem} />
                )}
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 2 — NEW / EDIT ITEM
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'item-form' && (
          <section className="page-view active">
            <PageHeader
              backLabel="Items"
              onBack={() => setActiveScreen('items')}
              title={itemFormId ? 'Edit Item' : 'New Item'}
            />

            <div className="form-container-card">
              <form onSubmit={handleSaveItem}>
                {/* Category */}
                <FormSection title="1. Category">
                  <div className="form-category-chips">
                    {categories.map((c) => (
                      <div
                        key={c.id}
                        className={`form-cat-chip ${itemFormCategory === c.id ? 'active' : ''}`}
                        onClick={() => {
                          setItemFormCategory(c.id);
                          if (!itemFormId) setItemFormTag(suggestTagForCategory(c.id));
                        }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                </FormSection>

                {/* Dynamic Fields */}
                <FormSection title="2. Details">
                  {(() => {
                    const cat = categories.find((c) => c.id === itemFormCategory);
                    return (cat?.fields || []).map((f) => {
                      const val = itemFormDetails[f.key] ?? '';
                      const update = (v: string) => setItemFormDetails({ ...itemFormDetails, [f.key]: v });
                      return (
                        <FormField key={f.key} label={f.label} required={f.required}>
                          {f.type === 'select' ? (
                            <select className="form-select" value={val} required={f.required} onChange={(e) => update(e.target.value)}>
                              <option value="">— Select {f.label} —</option>
                              {(f.options || '').split(',').map((opt) => (
                                <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                              ))}
                            </select>
                          ) : f.type === 'textarea' ? (
                            <textarea className="form-textarea" value={val} required={f.required} onChange={(e) => update(e.target.value)} />
                          ) : (
                            <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} className="form-input" value={val} required={f.required} onChange={(e) => update(e.target.value)} />
                          )}
                        </FormField>
                      );
                    });
                  })()}
                </FormSection>

                {/* Tracking */}
                <FormSection title="3. Tracking & Assignment">
                  <FormField label="Asset Tag" required>
                    <input type="text" className="form-input" required value={itemFormTag} onChange={(e) => setItemFormTag(e.target.value)} />
                  </FormField>
                  <FormField label="Assigned to Person">
                    <select className="form-select" value={itemFormAssignee} onChange={(e) => { const v = e.target.value; setItemFormAssignee(v); if (v) setItemFormStatus('In Use'); }}>
                      <option value="">— Unassigned (In Storage) —</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.user_name} ({u.job_title})</option>)}
                    </select>
                  </FormField>
                  <FormField label="Status">
                    <select className="form-select" value={itemFormStatus} onChange={(e) => setItemFormStatus(e.target.value)}>
                      <option value="In Use">In Use</option>
                      <option value="Available">Available</option>
                      <option value="In Storage">In Storage</option>
                      <option value="Needs Repair">Needs Repair</option>
                    </select>
                  </FormField>
                  <FormField label="Location">
                    <input type="text" className="form-input" placeholder="e.g. Room 402, Storage Locker B" value={itemFormLocation} onChange={(e) => setItemFormLocation(e.target.value)} />
                  </FormField>
                  <FormField label="Notes">
                    <textarea className="form-textarea" placeholder="Warranty, serial number, or condition notes…" value={itemFormNotes} onChange={(e) => setItemFormNotes(e.target.value)} />
                  </FormField>
                </FormSection>

                <FormActions
                  onCancel={() => setActiveScreen('items')}
                  submitLabel="Save Item"
                  danger={!!itemFormId}
                  dangerLabel="Delete Item"
                  onDanger={() => itemFormId && handleDeleteItem(itemFormId, itemFormTag)}
                />
              </form>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 3 — ITEM DETAIL
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'item-detail' && selectedItem && (
          <section className="page-view active">
            <PageHeader
              backLabel="Items"
              onBack={() => setActiveScreen('items')}
              title={selectedItem.assetTag}
              actions={
                <>
                  <Button variant="secondary" size="sm" onClick={() => handleOpenHandover(selectedItem)}>+ Handover</Button>
                  <Button variant="primary" size="sm" onClick={() => handleOpenEditItem(selectedItem)}>Edit</Button>
                  <Button variant="ghost" size="sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteItem(selectedItem.id, selectedItem.assetTag)}>Delete</Button>
                </>
              }
            />

            <div className="form-container-card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <TagCode>{selectedItem.assetTag}</TagCode>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{getItemTitle(selectedItem)}</h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Category: {selectedItem.category}</div>
                </div>
                <StatusPill status={selectedItem.status} />
              </div>

              {/* Current Holder */}
              <InfoBlock label="Current Holder">
                {selectedItem.assignedUserId ? (() => {
                  const u = users.find((usr) => usr.id === selectedItem.assignedUserId);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u?.user_name || 'U'} size={36} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{u?.user_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u?.job_title} • {u?.department || 'General'}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" style={{ color: 'var(--red)' }} onClick={() => handleQuickUnassign(selectedItem.id)}>
                        Unassign
                      </Button>
                    </div>
                  );
                })() : (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not assigned — currently in storage</div>
                )}
              </InfoBlock>

              {/* Specs */}
              <FormSection title="Specifications">
                <SpecGrid
                  specs={{
                    ...selectedItem.details,
                    Location: selectedItem.location || undefined,
                    Notes: selectedItem.notes || undefined,
                  }}
                />
              </FormSection>

              {/* Handover History */}
              <FormSection title="Handover History">
                <HandoverTimeline history={selectedItem.history || []} />
              </FormSection>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 4 — QUICK HANDOVER
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'item-handover' && selectedItem && (
          <section className="page-view active">
            <PageHeader
              backLabel="Item"
              onBack={() => setActiveScreen('item-detail')}
              title="Handover Asset"
            />

            <div className="form-container-card" style={{ maxWidth: 540 }}>
              <InfoBlock label="Item to Handover">
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {selectedItem.assetTag} • {getItemTitle(selectedItem)}
                </div>
              </InfoBlock>

              <form onSubmit={handleSubmitHandover}>
                <FormSection title="Transfer Details">
                  <FormField label="Handover to Person" required>
                    <select className="form-select" required value={handoverToUser} onChange={(e) => setHandoverToUser(e.target.value)}>
                      <option value="">— Return to Storage / Pool —</option>
                      {users.map((u) => {
                        const isCurrent = u.id === selectedItem.assignedUserId;
                        return <option key={u.id} value={u.id} disabled={isCurrent}>{u.user_name} ({u.job_title}) {isCurrent ? '— [Current]' : ''}</option>;
                      })}
                    </select>
                  </FormField>
                  <FormField label="Notes">
                    <textarea className="form-textarea" placeholder="Reason, device condition…" value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} />
                  </FormField>
                </FormSection>
                <FormActions onCancel={() => setActiveScreen('item-detail')} submitLabel="Complete Handover" />
              </form>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 5 — PEOPLE DIRECTORY
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'people' && (
          <section className="page-view active">
            <div className="action-bar">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or title…" />
            </div>

            <div className="content-card">
              <div className="table-container">
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Job Title</th>
                      <th>Department</th>
                      <th>Assigned Items</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((u) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return u.user_name.toLowerCase().includes(q) || u.job_title.toLowerCase().includes(q);
                      })
                      .map((u) => {
                        const held = items.filter((i) => i.assignedUserId === u.id);
                        return (
                          <tr key={u.id}>
                            <td>
                              <UserPill name={u.user_name} onClick={() => goToPerson(u.id)} />
                            </td>
                            <td>{u.job_title}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{u.department || 'General'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {held.length > 0
                                  ? held.map((item) => <TagCode key={item.id} onClick={() => goToItem(item.id)}>{item.assetTag}</TagCode>)
                                  : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>None</span>}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <Button variant="ghost" size="sm" onClick={() => goToPerson(u.id)}>View</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenEditPerson(u)}>Edit</Button>
                                <Button variant="ghost" size="sm" style={{ color: 'var(--red)' }} onClick={() => handleDeletePerson(u.id, u.user_name)}>Delete</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <EmptyState title="No people yet" description="Add your first team member." actionLabel="+ Add Person" onAction={handleOpenNewPerson} />
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 6 — ADD / EDIT PERSON
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'person-form' && (
          <section className="page-view active">
            <PageHeader
              backLabel="People"
              onBack={() => setActiveScreen('people')}
              title={personFormId ? 'Edit Person' : 'New Person'}
            />

            <div className="form-container-card" style={{ maxWidth: 500 }}>
              <form onSubmit={handleSavePerson}>
                <FormSection title="Person Details">
                  <FormField label="Full Name" required>
                    <input type="text" className="form-input" required placeholder="e.g. Bambang Sudirman" value={personName} onChange={(e) => setPersonName(e.target.value)} />
                  </FormField>
                  <FormField label="Job Title" required>
                    <input type="text" className="form-input" required placeholder="e.g. Senior GA Lead" value={personTitle} onChange={(e) => setPersonTitle(e.target.value)} />
                  </FormField>
                  <FormField label="Department">
                    <input type="text" className="form-input" placeholder="e.g. General Affairs, Finance" value={personDept} onChange={(e) => setPersonDept(e.target.value)} />
                  </FormField>
                </FormSection>
                <FormActions
                  onCancel={() => setActiveScreen('people')}
                  submitLabel="Save Person"
                  danger={!!personFormId}
                  dangerLabel="Delete Person"
                  onDanger={() => personFormId && handleDeletePerson(personFormId, personName)}
                />
              </form>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 7 — PERSON DETAIL
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'person-detail' && selectedPerson && (
          <section className="page-view active">
            <PageHeader
              backLabel="People"
              onBack={() => setActiveScreen('people')}
              title={selectedPerson.user_name}
              actions={
                <Button variant="primary" size="sm" onClick={() => handleOpenEditPerson(selectedPerson)}>Edit</Button>
              }
            />

            <div className="form-container-card">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <Avatar name={selectedPerson.user_name} size={48} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedPerson.user_name}</h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {selectedPerson.job_title} • {selectedPerson.department || 'General'}
                  </div>
                </div>
              </div>

              {/* Assigned Equipment */}
              {(() => {
                const assigned = items.filter((i) => i.assignedUserId === selectedPerson.id);
                return (
                  <FormSection title={`Assigned Equipment (${assigned.length})`}>
                    {assigned.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {assigned.map((item) => (
                          <div
                            key={item.id}
                            style={{ background: 'var(--surface-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <div style={{ cursor: 'pointer' }} onClick={() => goToItem(item.id)}>
                              <TagCode>{item.assetTag}</TagCode>
                              <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 8 }}>{getItemTitle(item)}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>({item.category})</span>
                            </div>
                            <Button variant="ghost" size="sm" style={{ color: 'var(--red)' }} onClick={() => handleQuickUnassign(item.id)}>
                              Unassign
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: 12, background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        No items currently assigned.
                      </div>
                    )}
                  </FormSection>
                );
              })()}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 8 — CATEGORIES MANAGER
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'categories' && (
          <section className="page-view active">
            <div className="action-bar" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" size="sm" onClick={handleOpenNewCategory}>+ Add Category</Button>
            </div>

            <div className="content-card">
              <div className="table-container">
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Prefix</th>
                      <th>Configured Fields</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                        <td><TagCode>{c.code_prefix}</TagCode></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(c.fields || []).map((f) => (
                              <FieldBadge key={f.key}>{f.label}{f.required ? ' *' : ''}</FieldBadge>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditCategory(c)}>Edit Fields</Button>
                            <Button variant="ghost" size="sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteCategory(c.id, c.name)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {categories.length === 0 && (
                <EmptyState title="No categories yet" description="Create your first category to start tracking assets." actionLabel="+ Add Category" onAction={handleOpenNewCategory} />
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 9 — ADD / EDIT CATEGORY
        ══════════════════════════════════════════════════════════════════ */}
        {activeScreen === 'category-form' && (
          <section className="page-view active">
            <PageHeader
              backLabel="Categories"
              onBack={() => setActiveScreen('categories')}
              title={editingCategoryId ? `Configure: ${catName}` : 'New Category'}
            />

            <div className="form-container-card">
              <form onSubmit={handleSaveCategory}>
                <FormSection title="Category Info">
                  <FormField label="Category Name" required>
                    <input type="text" className="form-input" required placeholder="e.g. Monitor, Furniture, SIM Card" value={catName} disabled={!!editingCategoryId} onChange={(e) => setCatName(e.target.value)} />
                  </FormField>
                  <FormField label="Code Prefix" required>
                    <input type="text" className="form-input" required placeholder="e.g. MON, FUR, SIM" value={catPrefix} onChange={(e) => setCatPrefix(e.target.value.toUpperCase())} />
                  </FormField>
                </FormSection>

                <FormSection
                  title="Custom Fields"
                  actions={
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCatFields([...catFields, { key: 'field_' + Date.now().toString(36), label: '', type: 'text', required: true }])}
                    >
                      + Add Field
                    </Button>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {catFields.map((f, idx) => (
                      <div key={idx} style={{ background: 'var(--surface-secondary)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Field Label (e.g. Screen Size)"
                            required
                            style={{ flex: 2 }}
                            value={f.label}
                            onChange={(e) => {
                              const updated = [...catFields];
                              updated[idx].label = e.target.value;
                              updated[idx].key = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
                              setCatFields(updated);
                            }}
                          />
                          <select className="form-select" style={{ flex: 1.2 }} value={f.type} onChange={(e) => { const u = [...catFields]; u[idx].type = e.target.value as any; setCatFields(u); }}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Dropdown</option>
                            <option value="textarea">Notes</option>
                          </select>
                          <select className="form-select" style={{ flex: 1 }} value={f.required ? 'true' : 'false'} onChange={(e) => { const u = [...catFields]; u[idx].required = e.target.value === 'true'; setCatFields(u); }}>
                            <option value="true">Required</option>
                            <option value="false">Optional</option>
                          </select>
                          <Button type="button" variant="ghost" size="sm" style={{ color: 'var(--red)', fontSize: 16 }} onClick={() => setCatFields(catFields.filter((_, i) => i !== idx))}>
                            ×
                          </Button>
                        </div>
                        {f.type === 'select' && (
                          <div style={{ marginTop: 8 }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Comma-separated options (e.g. IPS, OLED, VA)"
                              style={{ fontSize: 12, padding: '6px 10px' }}
                              value={f.options || ''}
                              onChange={(e) => { const u = [...catFields]; u[idx].options = e.target.value; setCatFields(u); }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </FormSection>

                <FormActions onCancel={() => setActiveScreen('categories')} submitLabel="Save Category" />
              </form>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
