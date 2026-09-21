"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';

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
  assignedUserTitle?: string;
  assignedUserDept?: string;
  history?: HandoverHistoryItem[];
}

export default function InventoryApp() {
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Active Screen Navigation
  // 'items' | 'people' | 'categories' | 'item-form' | 'item-detail' | 'item-handover' | 'person-form' | 'person-detail' | 'category-form'
  const [activeScreen, setActiveScreen] = useState<string>('items');

  // Filters & View Modes
  const [currentCategoryFilter, setCurrentCategoryFilter] = useState('ALL');
  const [currentStatusFilter, setCurrentStatusFilter] = useState('ALL');
  const [currentPeopleFilter, setCurrentPeopleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsViewMode, setItemsViewMode] = useState<'table' | 'cards'>('table');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Form & Detail Selections
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Item Form State
  const [itemFormId, setItemFormId] = useState<string | null>(null);
  const [itemFormCategory, setItemFormCategory] = useState<string>('Laptop');
  const [itemFormTag, setItemFormTag] = useState('');
  const [itemFormStatus, setItemFormStatus] = useState('Available');
  const [itemFormAssignee, setItemFormAssignee] = useState('');
  const [itemFormLocation, setItemFormLocation] = useState('');
  const [itemFormNotes, setItemFormNotes] = useState('');
  const [itemFormDetails, setItemFormDetails] = useState<Record<string, any>>({});

  // Handover Form State
  const [handoverToUser, setHandoverToUser] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Person Form State
  const [personFormId, setPersonFormId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [personTitle, setPersonTitle] = useState('');
  const [personDept, setPersonDept] = useState('');

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catPrefix, setCatPrefix] = useState('');
  const [catFields, setCatFields] = useState<CategoryField[]>([]);

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch initial data from Cloudflare D1 API
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
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      showToast('Error connecting to D1 database');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // Active Main Tab
  const mainTab = useMemo(() => {
    if (['items', 'item-form', 'item-detail', 'item-handover'].includes(activeScreen)) return 'items';
    if (['people', 'person-form', 'person-detail'].includes(activeScreen)) return 'people';
    if (['categories', 'category-form'].includes(activeScreen)) return 'categories';
    return 'items';
  }, [activeScreen]);

  // Selected item / person / category references
  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  const selectedPerson = useMemo(() => {
    return users.find((u) => u.id === selectedPersonId) || null;
  }, [users, selectedPersonId]);

  // Items Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (currentCategoryFilter !== 'ALL' && item.category !== currentCategoryFilter) return false;
      if (currentStatusFilter !== 'ALL' && item.status !== currentStatusFilter) return false;
      if (currentPeopleFilter === 'ASSIGNED' && !item.assignedUserId) return false;
      if (currentPeopleFilter === 'UNASSIGNED' && item.assignedUserId) return false;
      if (currentPeopleFilter.startsWith('USR_') && item.assignedUserId !== currentPeopleFilter.replace('USR_', '')) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const u = users.find((usr) => usr.id === item.assignedUserId);
        const uName = u ? u.user_name.toLowerCase() : '';
        const detailsStr = Object.values(item.details || {}).join(' ').toLowerCase();

        const match =
          item.assetTag.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.location && item.location.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q)) ||
          uName.includes(q) ||
          detailsStr.includes(q);

        if (!match) return false;
      }
      return true;
    });
  }, [items, users, currentCategoryFilter, currentStatusFilter, currentPeopleFilter, searchQuery]);

  // Helper to format item title
  function getItemTitle(item: Item) {
    const d = item.details || {};
    if (item.category === 'Laptop') return d.brand || 'Laptop';
    if (item.category === 'General') return d.item || 'General Item';
    if (item.category === 'Phone') return d.brand || 'Phone';
    if (item.category === 'Provider') return d.provider_name || 'Service';
    return Object.values(d)[0] || item.assetTag;
  }

  // Suggest Asset Tag
  function suggestTagForCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    const prefix = cat ? cat.code_prefix : 'AST';
    const sameCat = items.filter((i) => i.category === catId);
    const nextNum = (sameCat.length + 1).toString().padStart(3, '0');
    return `${prefix}-${nextNum}`;
  }

  // Switch Main Tabs
  function handleTabSwitch(tab: 'items' | 'people' | 'categories') {
    setActiveScreen(tab);
    setSearchQuery('');
  }

  // Open New Item Form Page
  function handleOpenNewItem() {
    const defaultCat = categories[0]?.id || 'Laptop';
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

  // Open Edit Item Form Page
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

  // Save Item (Create / Update)
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
        // Update
        const res = await fetch(`/api/items/${itemFormId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update item');
        showToast('Saved item');
      } else {
        // Create
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create item');
        showToast('Added new item');
      }

      await loadData();
      setActiveScreen('items');
    } catch (err: any) {
      alert(err.message || 'Save error');
    }
  }

  // Delete Item
  async function handleDeleteItem(id: string, tag: string) {
    if (!confirm(`Delete item "${tag}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      showToast('Item deleted');
      await loadData();
      setActiveScreen('items');
    } catch (err: any) {
      alert(err.message || 'Delete error');
    }
  }

  // Open Quick Handover Page
  function handleOpenHandover(item: Item) {
    setSelectedItemId(item.id);
    setHandoverToUser('');
    setHandoverNotes('');
    setActiveScreen('item-handover');
  }

  // Submit Quick Handover
  async function handleSubmitHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId) return;

    try {
      const res = await fetch(`/api/items/${selectedItemId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: handoverToUser || null,
          notes: handoverNotes,
        }),
      });

      if (!res.ok) throw new Error('Failed to record handover');
      const data = await res.json();
      showToast(`Handed over to ${data.toName}`);
      await loadData();
      setActiveScreen('item-detail');
    } catch (err: any) {
      alert(err.message || 'Handover error');
    }
  }

  // Open New Person Page
  function handleOpenNewPerson() {
    setPersonFormId(null);
    setPersonName('');
    setPersonTitle('');
    setPersonDept('');
    setActiveScreen('person-form');
  }

  // Open Edit Person Page
  function handleOpenEditPerson(u: User) {
    setPersonFormId(u.id);
    setPersonName(u.user_name);
    setPersonTitle(u.job_title);
    setPersonDept(u.department || '');
    setActiveScreen('person-form');
  }

  // Save Person (Create / Update)
  async function handleSavePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || !personTitle.trim()) return;

    try {
      const payload = {
        userName: personName.trim(),
        jobTitle: personTitle.trim(),
        department: personDept.trim() || 'General',
      };

      if (personFormId) {
        const res = await fetch(`/api/users/${personFormId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update person');
        showToast(`Saved ${personName}`);
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create person');
        showToast(`Added ${personName}`);
      }

      await loadData();
      setActiveScreen('people');
    } catch (err: any) {
      alert(err.message || 'Save error');
    }
  }

  // Delete Person
  async function handleDeletePerson(id: string, name: string) {
    if (!confirm(`Delete person "${name}"? Any items assigned to them will be marked unassigned.`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete person');
      showToast('Person removed');
      await loadData();
      setActiveScreen('people');
    } catch (err: any) {
      alert(err.message || 'Delete error');
    }
  }

  // Quick Unassign an item
  async function handleQuickUnassign(itemId: string) {
    try {
      const res = await fetch(`/api/items/${itemId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: null,
          notes: 'Unassigned & returned to storage',
        }),
      });
      if (!res.ok) throw new Error('Failed to unassign item');
      showToast('Item unassigned');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Unassign error');
    }
  }

  // Open New Category Page
  function handleOpenNewCategory() {
    setEditingCategoryId(null);
    setCatName('');
    setCatPrefix('');
    setCatFields([{ key: 'brand', label: 'Brand & Model', type: 'text', required: true }]);
    setActiveScreen('category-form');
  }

  // Open Edit Category Page
  function handleOpenEditCategory(cat: Category) {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatPrefix(cat.code_prefix);
    setCatFields(cat.fields ? [...cat.fields] : []);
    setActiveScreen('category-form');
  }

  // Save Category
  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim() || !catPrefix.trim()) return;

    try {
      const payload = {
        name: catName.trim(),
        codePrefix: catPrefix.trim().toUpperCase(),
        fields: catFields,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save category');
      showToast(`Saved category ${catName}`);
      await loadData();
      setActiveScreen('categories');
    } catch (err: any) {
      alert(err.message || 'Category error');
    }
  }

  // Delete Category
  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Any items in this category will also be removed.`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      showToast('Category deleted');
      await loadData();
      setActiveScreen('categories');
    } catch (err: any) {
      alert(err.message || 'Delete error');
    }
  }

  // ==================== MANAGEABLE EXCEL / CSV EXPORT SUITE ====================
  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  function sanitizeCell(val: any) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\r?\n|\r/g, ' ').trim();
  }

  function downloadCSV(rows: string[][], filename: string, toastMsg: string) {
    const csvContent =
      '\uFEFF' +
      rows.map((r) => r.map((c) => `"${sanitizeCell(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    showToast(toastMsg || 'Exported spreadsheet');
  }

  // 1. Export Current View
  function exportCurrentView() {
    if (filteredItems.length === 0) {
      alert('No items in current view to export.');
      return;
    }
    const today = getTodayString();

    if (currentCategoryFilter !== 'ALL') {
      const cat = categories.find((c) => c.id === currentCategoryFilter);
      const catFields = cat && cat.fields ? cat.fields : [];

      const headers = [
        'Asset Tag',
        'Category',
        ...catFields.map((f) => f.label),
        'Status',
        'Assigned To',
        'Job Title',
        'Department',
        'Location',
        'Notes',
        'Last Transfer Date',
        'Last Transfer From',
        'Latest Transfer Notes',
      ];

      const rows = [headers];
      filteredItems.forEach((item) => {
        const u = users.find((usr) => usr.id === item.assignedUserId);
        const details = item.details || {};
        const lastTransfer = item.history && item.history.length > 0 ? item.history[0] : null;

        rows.push([
          item.assetTag,
          item.category,
          ...catFields.map((f) => details[f.key] || ''),
          item.status,
          u ? u.user_name : 'Unassigned',
          u ? u.job_title : '',
          u ? u.department || 'General' : '',
          item.location || '',
          item.notes || '',
          lastTransfer ? lastTransfer.date : '',
          lastTransfer ? lastTransfer.from : '',
          lastTransfer ? lastTransfer.notes || '' : '',
        ]);
      });

      const safeCat = currentCategoryFilter.toLowerCase().replace(/[^a-z0-9]/g, '_');
      downloadCSV(rows, `ga_inventory_${safeCat}_${today}.csv`, `Exported ${filteredItems.length} ${currentCategoryFilter} items`);
    } else {
      const fieldMap = new Map<string, string>();
      categories.forEach((c) => {
        (c.fields || []).forEach((f) => {
          if (!fieldMap.has(f.key)) fieldMap.set(f.key, f.label);
        });
      });
      const fieldKeys = Array.from(fieldMap.keys());
      const fieldLabels = Array.from(fieldMap.values());

      const headers = [
        'Asset Tag',
        'Category',
        'Item Description',
        ...fieldLabels,
        'Status',
        'Assigned To',
        'Job Title',
        'Department',
        'Location',
        'Notes',
        'Last Transfer Date',
        'Last Transfer From',
      ];

      const rows = [headers];
      filteredItems.forEach((item) => {
        const u = users.find((usr) => usr.id === item.assignedUserId);
        const details = item.details || {};
        const lastTransfer = item.history && item.history.length > 0 ? item.history[0] : null;

        rows.push([
          item.assetTag,
          item.category,
          getItemTitle(item),
          ...fieldKeys.map((k) => details[k] || ''),
          item.status,
          u ? u.user_name : 'Unassigned',
          u ? u.job_title : '',
          u ? u.department || 'General' : '',
          item.location || '',
          item.notes || '',
          lastTransfer ? lastTransfer.date : '',
          lastTransfer ? lastTransfer.from : '',
        ]);
      });

      downloadCSV(rows, `ga_inventory_view_${today}.csv`, `Exported Current View (${filteredItems.length} items)`);
    }
  }

  // 2. Export Master Inventory
  function exportMasterInventory() {
    if (items.length === 0) {
      alert('No items in database to export.');
      return;
    }
    const today = getTodayString();

    const fieldMap = new Map<string, string>();
    categories.forEach((c) => {
      (c.fields || []).forEach((f) => {
        if (!fieldMap.has(f.key)) fieldMap.set(f.key, f.label);
      });
    });
    const fieldKeys = Array.from(fieldMap.keys());
    const fieldLabels = Array.from(fieldMap.values());

    const headers = [
      'Asset Tag',
      'Category',
      'Item Description',
      'Status',
      'Assigned To',
      'Job Title',
      'Department',
      ...fieldLabels,
      'Location',
      'Notes',
      'Total Transfers',
      'Last Transfer Date',
      'Last Transfer From',
      'Latest Transfer Notes',
    ];

    const rows = [headers];
    items.forEach((item) => {
      const u = users.find((usr) => usr.id === item.assignedUserId);
      const details = item.details || {};
      const history = item.history || [];
      const lastTransfer = history.length > 0 ? history[0] : null;

      rows.push([
        item.assetTag,
        item.category,
        getItemTitle(item),
        item.status,
        u ? u.user_name : 'Unassigned',
        u ? u.job_title : '',
        u ? u.department || 'General' : '',
        ...fieldKeys.map((k) => details[k] || ''),
        item.location || '',
        item.notes || '',
        String(history.length),
        lastTransfer ? lastTransfer.date : '',
        lastTransfer ? lastTransfer.from : '',
        lastTransfer ? lastTransfer.notes || '' : '',
      ]);
    });

    downloadCSV(rows, `ga_master_inventory_${today}.csv`, `Exported Master Inventory (${items.length} items)`);
  }

  // 3. Export Handover Transfer Ledger
  async function exportHandoverLedger() {
    try {
      const res = await fetch('/api/handover-logs');
      const data = await res.json();
      const logs = data.logs || [];

      if (logs.length === 0) {
        alert('No handover logs recorded yet.');
        return;
      }

      const headers = [
        'Transfer Date',
        'Asset Tag',
        'Item Description',
        'Category',
        'Transferred From',
        'Transferred To',
        'Current Item Status',
        'Handover Notes',
      ];

      const rows = [headers];
      logs.forEach((l: any) => {
        rows.push([l.date, l.assetTag, l.itemTitle, l.category, l.from, l.to, l.status, l.notes]);
      });

      downloadCSV(rows, `ga_handover_audit_ledger_${getTodayString()}.csv`, `Exported Handover Ledger (${logs.length} transfers)`);
    } catch (err) {
      alert('Failed to export handover log');
    }
  }

  // Reset to Sample Data
  async function handleResetData() {
    if (!confirm('Reset inventory to default sample data in Cloudflare D1?')) return;
    try {
      await fetch('/api/reset', { method: 'POST' });
      showToast('Database reset to defaults');
      await loadData();
      setActiveScreen('items');
    } catch (err) {
      alert('Reset failed');
    }
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'rgba(29, 29, 31, 0.9)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '9999px',
            fontSize: 13,
            fontWeight: 500,
            zIndex: 9999,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Top Header */}
      <header className="nav-header">
        <div className="header-content">
          <div className="app-title-group" onClick={() => handleTabSwitch('items')}>
            <div className="app-logo">GA</div>
            <h1 className="app-title">Inventory</h1>
          </div>

          <div className="header-controls">
            {/* Manageable Excel Dropdown */}
            <div className="export-dropdown-wrapper" ref={exportMenuRef} style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                title="Export to Excel spreadsheet"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
                Export Excel
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {exportMenuOpen && (
                <div className="apple-dropdown-menu" style={{ display: 'block' }}>
                  <div className="dropdown-header-label">Export Spreadsheet (.csv)</div>
                  <button className="dropdown-option" onClick={exportCurrentView}>
                    <div className="dropdown-option-title">
                      <span>Current View</span>
                      <span className="dropdown-option-badge">{filteredItems.length} items</span>
                    </div>
                    <div className="dropdown-option-desc">Export items matching active search & filters</div>
                  </button>
                  <button className="dropdown-option" onClick={exportMasterInventory}>
                    <div className="dropdown-option-title">
                      <span>All Inventory (Master)</span>
                      <span className="dropdown-option-badge">{items.length} items</span>
                    </div>
                    <div className="dropdown-option-desc">All categories with dedicated attribute columns</div>
                  </button>
                  <div className="dropdown-separator" />
                  <button className="dropdown-option" onClick={exportHandoverLedger}>
                    <div className="dropdown-option-title">
                      <span>Handover Transfer Log</span>
                      <span className="dropdown-option-badge">Ledger</span>
                    </div>
                    <div className="dropdown-option-desc">Chronological history of all asset movements</div>
                  </button>
                </div>
              )}
            </div>

            <button className="btn btn-ghost btn-sm" onClick={handleResetData}>
              Reset
            </button>

            {mainTab === 'items' && (
              <button className="btn btn-primary" onClick={handleOpenNewItem}>
                + Add Item
              </button>
            )}
            {mainTab === 'people' && (
              <button className="btn btn-primary" onClick={handleOpenNewPerson}>
                + Add Person
              </button>
            )}
            {mainTab === 'categories' && (
              <button className="btn btn-primary" onClick={handleOpenNewCategory}>
                + Add Category
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Top Segmented Tabs (Visible on list screens) */}
        {['items', 'people', 'categories'].includes(activeScreen) && (
          <div id="main-tabs-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <nav className="segmented-control">
              <button
                className={`segment-btn ${mainTab === 'items' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('items')}
              >
                <span>Items</span>
                <span className="segment-count">{items.length}</span>
              </button>
              <button
                className={`segment-btn ${mainTab === 'people' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('people')}
              >
                <span>People</span>
                <span className="segment-count">{users.length}</span>
              </button>
              <button
                className={`segment-btn ${mainTab === 'categories' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('categories')}
              >
                <span>Categories</span>
                <span className="segment-count">{categories.length}</span>
              </button>
            </nav>
          </div>
        )}

        {/* ==================== PAGE 1: ITEMS LIST ==================== */}
        {activeScreen === 'items' && (
          <section className="page-view active">
            {/* Category Filter Pills */}
            <div className="category-pills">
              <button
                className={`category-pill ${currentCategoryFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setCurrentCategoryFilter('ALL')}
              >
                All
                <span className="pill-count">{items.length}</span>
              </button>
              {categories.map((c) => {
                const count = items.filter((i) => i.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    className={`category-pill ${currentCategoryFilter === c.id ? 'active' : ''}`}
                    onClick={() => setCurrentCategoryFilter(c.id)}
                  >
                    {c.name}
                    <span className="pill-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Action & Filter Bar */}
            <div className="action-bar">
              <div className="search-input-wrapper">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search items, tags, or assignees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="filter-select"
                  value={currentStatusFilter}
                  onChange={(e) => setCurrentStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="In Use">In Use</option>
                  <option value="Available">Available</option>
                  <option value="In Storage">In Storage</option>
                  <option value="Repair">Needs Repair</option>
                </select>

                <select
                  className="filter-select"
                  value={currentPeopleFilter}
                  onChange={(e) => setCurrentPeopleFilter(e.target.value)}
                >
                  <option value="ALL">All People</option>
                  <option value="ASSIGNED">Assigned Only</option>
                  <option value="UNASSIGNED">Unassigned Only</option>
                  {users.map((u) => (
                    <option key={u.id} value={`USR_${u.id}`}>
                      {u.user_name}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setItemsViewMode(itemsViewMode === 'table' ? 'cards' : 'table')}
                >
                  <span>{itemsViewMode === 'table' ? 'Cards' : 'Table'}</span>
                </button>
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
                        const statusClass =
                          item.status === 'In Use'
                            ? 'status-inuse'
                            : item.status === 'Available'
                            ? 'status-available'
                            : item.status === 'Needs Repair'
                            ? 'status-repair'
                            : 'status-storage';

                        return (
                          <tr key={item.id}>
                            <td>
                              <span
                                className="tag-code"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setActiveScreen('item-detail');
                                }}
                              >
                                {item.assetTag}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.category}</span>
                            </td>
                            <td>
                              <div
                                style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setActiveScreen('item-detail');
                                }}
                              >
                                {getItemTitle(item)}
                              </div>
                            </td>
                            <td>
                              {u ? (
                                <div
                                  className="user-pill"
                                  onClick={() => {
                                    setSelectedPersonId(u.id);
                                    setActiveScreen('person-detail');
                                  }}
                                >
                                  <span className="user-avatar">{u.user_name.charAt(0)}</span>
                                  <span>{u.user_name}</span>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>In Storage</span>
                              )}
                            </td>
                            <td>
                              <span className={`status-pill ${statusClass}`}>{item.status}</span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.location || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleOpenHandover(item)}
                                >
                                  Handover
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => {
                                    setSelectedItemId(item.id);
                                    setActiveScreen('item-detail');
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleOpenEditItem(item)}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredItems.length === 0 && (
                  <div className="empty-box" style={{ display: 'block' }}>
                    <h4>No items found</h4>
                    <p>Try searching for something else or add a new item.</p>
                    <button className="btn btn-primary btn-sm" onClick={handleOpenNewItem}>
                      + Add Item
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cards View */}
            {itemsViewMode === 'cards' && (
              <div className="cards-grid">
                {filteredItems.map((item) => {
                  const u = users.find((usr) => usr.id === item.assignedUserId);
                  return (
                    <div
                      key={item.id}
                      className="asset-card"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setActiveScreen('item-detail');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span className="tag-code">{item.assetTag}</span>
                        <span className="status-pill status-inuse">{item.status}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{getItemTitle(item)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        {item.category} • {item.location || 'No location'}
                      </div>
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {u ? u.user_name : 'In Storage'}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHandover(item);
                          }}
                        >
                          Handover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ==================== PAGE 2: NEW / EDIT ITEM ==================== */}
        {activeScreen === 'item-form' && (
          <section className="page-view active">
            <div className="page-header-bar">
              <button className="back-btn" onClick={() => setActiveScreen('items')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Items</span>
              </button>
              <h2 className="page-title" style={{ fontSize: 18 }}>
                {itemFormId ? 'Edit Item' : 'New Item'}
              </h2>
              <div style={{ width: 50 }} />
            </div>

            <div className="form-container-card">
              <form onSubmit={handleSaveItem}>
                {/* Category Selection */}
                <div className="form-section">
                  <div className="form-section-title">1. Category</div>
                  <div className="form-category-chips">
                    {categories.map((c) => (
                      <div
                        key={c.id}
                        className={`form-chip ${itemFormCategory === c.id ? 'active' : ''}`}
                        onClick={() => {
                          setItemFormCategory(c.id);
                          if (!itemFormId) setItemFormTag(suggestTagForCategory(c.id));
                        }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Dynamic Fields */}
                <div className="form-section">
                  <div className="form-section-title">2. Details</div>
                  {(() => {
                    const cat = categories.find((c) => c.id === itemFormCategory);
                    const fields = cat && cat.fields ? cat.fields : [];

                    return fields.map((f) => {
                      const val = itemFormDetails[f.key] ?? '';
                      return (
                        <div key={f.key} className="form-row">
                          <label>
                            {f.label} {f.required && <span style={{ color: 'var(--red)' }}>*</span>}
                          </label>

                          {f.type === 'select' ? (
                            <select
                              className="form-select"
                              value={val}
                              required={f.required}
                              onChange={(e) => setItemFormDetails({ ...itemFormDetails, [f.key]: e.target.value })}
                            >
                              <option value="">— Select {f.label} —</option>
                              {(f.options || '').split(',').map((opt) => (
                                <option key={opt.trim()} value={opt.trim()}>
                                  {opt.trim()}
                                </option>
                              ))}
                            </select>
                          ) : f.type === 'textarea' ? (
                            <textarea
                              className="form-textarea"
                              value={val}
                              required={f.required}
                              onChange={(e) => setItemFormDetails({ ...itemFormDetails, [f.key]: e.target.value })}
                            />
                          ) : (
                            <input
                              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                              className="form-input"
                              value={val}
                              required={f.required}
                              onChange={(e) => setItemFormDetails({ ...itemFormDetails, [f.key]: e.target.value })}
                            />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Tracking & Assignment */}
                <div className="form-section">
                  <div className="form-section-title">3. Tracking & Assignment</div>
                  <div className="form-row">
                    <label>Asset Tag *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={itemFormTag}
                      onChange={(e) => setItemFormTag(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Assigned to Person</label>
                    <select
                      className="form-select"
                      value={itemFormAssignee}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemFormAssignee(val);
                        if (val) setItemFormStatus('In Use');
                      }}
                    >
                      <option value="">— Unassigned (In Storage) —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.user_name} ({u.job_title})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <label>Status</label>
                    <select
                      className="form-select"
                      value={itemFormStatus}
                      onChange={(e) => setItemFormStatus(e.target.value)}
                    >
                      <option value="In Use">In Use</option>
                      <option value="Available">Available</option>
                      <option value="In Storage">In Storage</option>
                      <option value="Needs Repair">Needs Repair</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label>Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Room 402, Storage Locker B"
                      value={itemFormLocation}
                      onChange={(e) => setItemFormLocation(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Warranty, serial number, or condition notes..."
                      value={itemFormNotes}
                      onChange={(e) => setItemFormNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button type="button" className="btn btn-ghost" onClick={() => setActiveScreen('items')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ==================== PAGE 3: ITEM DETAIL VIEW ==================== */}
        {activeScreen === 'item-detail' && selectedItem && (
          <section className="page-view active">
            <div className="page-header-bar">
              <button className="back-btn" onClick={() => setActiveScreen('items')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Items</span>
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenHandover(selectedItem)}>
                  + Handover Item
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenEditItem(selectedItem)}>
                  Edit Item
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)' }}
                  onClick={() => handleDeleteItem(selectedItem.id, selectedItem.assetTag)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="form-container-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span className="tag-code">{selectedItem.assetTag}</span>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{getItemTitle(selectedItem)}</h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Category: {selectedItem.category}</div>
                </div>
                <span className="status-pill status-inuse">{selectedItem.status}</span>
              </div>

              {/* Current Assignee Callout */}
              <div style={{ background: 'var(--surface-secondary)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Current Holder
                </div>
                {selectedItem.assignedUserId ? (
                  (() => {
                    const u = users.find((usr) => usr.id === selectedItem.assignedUserId);
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="user-avatar">{u?.user_name.charAt(0) || 'U'}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u?.user_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {u?.job_title} • {u?.department || 'General'}
                            </div>
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleQuickUnassign(selectedItem.id)}>
                          Unassign
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Not assigned to anyone (Currently In Storage)
                  </div>
                )}
              </div>

              {/* Specifications */}
              <div className="form-section">
                <div className="form-section-title">Item Specifications</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {Object.entries(selectedItem.details || {}).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{String(v)}</div>
                    </div>
                  ))}
                  <div style={{ background: 'var(--surface-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Location</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{selectedItem.location || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Handover History Timeline */}
              <div className="form-section" style={{ marginTop: 24 }}>
                <div className="form-section-title">Handover History Timeline</div>
                {selectedItem.history && selectedItem.history.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {selectedItem.history.map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--surface-secondary)',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid var(--apple-blue)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{h.date || 'Past'}</span>
                          <span>{h.from} → {h.to}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{h.notes || 'Routine transfer'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No transfer history recorded yet.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==================== PAGE 4: QUICK HANDOVER PAGE ==================== */}
        {activeScreen === 'item-handover' && selectedItem && (
          <section className="page-view active">
            <div className="page-header-bar">
              <button className="back-btn" onClick={() => setActiveScreen('item-detail')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Item</span>
              </button>
              <h2 className="page-title" style={{ fontSize: 18 }}>
                Handover Asset
              </h2>
              <div style={{ width: 50 }} />
            </div>

            <div className="form-container-card" style={{ maxWidth: 540 }}>
              <form onSubmit={handleSubmitHandover}>
                <div style={{ background: 'var(--surface-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Item to Handover
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                    {selectedItem.assetTag} • {getItemTitle(selectedItem)}
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-row">
                    <label>Handover to Person *</label>
                    <select
                      className="form-select"
                      required
                      value={handoverToUser}
                      onChange={(e) => setHandoverToUser(e.target.value)}
                    >
                      <option value="">— Return to Storage / Pool —</option>
                      {users.map((u) => {
                        const isCurrent = u.id === selectedItem.assignedUserId;
                        return (
                          <option key={u.id} value={u.id} disabled={isCurrent}>
                            {u.user_name} ({u.job_title}) {isCurrent ? '— [Current]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-row">
                    <label>Handover Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Reason for handover, device condition..."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button type="button" className="btn btn-ghost" onClick={() => setActiveScreen('item-detail')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Complete Handover
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ==================== PAGE 5: PEOPLE DIRECTORY ==================== */}
        {activeScreen === 'people' && (
          <section className="page-view active">
            <div className="action-bar">
              <div className="search-input-wrapper">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search people by name or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
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
                              <div
                                className="user-pill"
                                onClick={() => {
                                  setSelectedPersonId(u.id);
                                  setActiveScreen('person-detail');
                                }}
                              >
                                <span className="user-avatar">{u.user_name.charAt(0)}</span>
                                <span style={{ fontWeight: 600 }}>{u.user_name}</span>
                              </div>
                            </td>
                            <td>{u.job_title}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{u.department || 'General'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {held.length > 0 ? (
                                  held.map((item) => (
                                    <span
                                      key={item.id}
                                      className="tag-code"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        setSelectedItemId(item.id);
                                        setActiveScreen('item-detail');
                                      }}
                                    >
                                      {item.assetTag}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No items</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => {
                                    setSelectedPersonId(u.id);
                                    setActiveScreen('person-detail');
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleOpenEditPerson(u)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--red)' }}
                                  onClick={() => handleDeletePerson(u.id, u.user_name)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================== PAGE 6: ADD / EDIT PERSON ==================== */}
        {activeScreen === 'person-form' && (
          <section className="page-view active">
            <div className="page-header-bar">
              <button className="back-btn" onClick={() => setActiveScreen('people')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>People</span>
              </button>
              <h2 className="page-title" style={{ fontSize: 18 }}>
                {personFormId ? 'Edit Person' : 'New Person'}
              </h2>
              <div style={{ width: 50 }} />
            </div>

            <div className="form-container-card" style={{ maxWidth: 500 }}>
              <form onSubmit={handleSavePerson}>
                <div className="form-section">
                  <div className="form-row">
                    <label>User Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Bambang Sudirman"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Job Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Senior GA Lead"
                      value={personTitle}
                      onChange={(e) => setPersonTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Department</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. General Affairs, Finance, Operations"
                      value={personDept}
                      onChange={(e) => setPersonDept(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button type="button" className="btn btn-ghost" onClick={() => setActiveScreen('people')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Person
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ==================== PAGE 7: PERSON DETAIL ==================== */}
        {activeScreen === 'person-detail' && selectedPerson && (
          <section className="page-view active">
            <div className="page-header-bar">
              <button className="back-btn" onClick={() => setActiveScreen('people')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>People</span>
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenEditPerson(selectedPerson)}>
                  Edit Person
                </button>
              </div>
            </div>

            <div className="form-container-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <span className="user-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
                  {selectedPerson.user_name.charAt(0)}
                </span>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedPerson.user_name}</h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {selectedPerson.job_title} • {selectedPerson.department || 'General'}
                  </div>
                </div>
              </div>

              {/* Assigned Items */}
              {(() => {
                const assigned = items.filter((i) => i.assignedUserId === selectedPerson.id);
                return (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Assigned Equipment ({assigned.length})
                    </div>
                    {assigned.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {assigned.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: 'var(--surface-secondary)',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setActiveScreen('item-detail');
                              }}
                            >
                              <span className="tag-code">{item.assetTag}</span>
                              <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 8 }}>{getItemTitle(item)}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>
                                ({item.category})
                              </span>
                            </div>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--red)' }}
                              onClick={() => handleQuickUnassign(item.id)}
                            >
                              Unassign
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 12, background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        No items currently assigned.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* ==================== PAGE 8: CATEGORIES MANAGER ==================== */}
        {activeScreen === 'categories' && (
          <section className="page-view active">
            <div className="action-bar" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleOpenNewCategory}>
                + Add Category
              </button>
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
                    {categories.map((c) => {
                      const fieldsCount = c.fields ? c.fields.length : 0;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                          </td>
                          <td>
                            <span className="tag-code">{c.code_prefix}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {(c.fields || []).map((f) => (
                                <span key={f.key} className="dropdown-option-badge">
                                  {f.label} {f.required ? '*' : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEditCategory(c)}>
                                Edit Fields
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--red)' }}
                                onClick={() => handleDeleteCategory(c.id, c.name)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================== PAGE 9: ADD / EDIT CATEGORY ==================== */}
        {activeScreen === 'category-form' && (
          <section className="page-view active">
            <div className="page-header-bar">
              <button className="back-btn" onClick={() => setActiveScreen('categories')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Categories</span>
              </button>
              <h2 className="page-title" style={{ fontSize: 18 }}>
                {editingCategoryId ? `Configure Category: ${catName}` : 'New Category'}
              </h2>
              <div style={{ width: 50 }} />
            </div>

            <div className="form-container-card">
              <form onSubmit={handleSaveCategory}>
                <div className="form-section">
                  <div className="form-row">
                    <label>Category Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Monitor, Furniture, SIM Card"
                      value={catName}
                      disabled={!!editingCategoryId}
                      onChange={(e) => setCatName(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Code Prefix *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. MON, FUR, SIM"
                      value={catPrefix}
                      onChange={(e) => setCatPrefix(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                {/* Field Builder */}
                <div className="form-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div className="form-section-title" style={{ margin: 0 }}>
                      Custom Fields
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setCatFields([
                          ...catFields,
                          {
                            key: 'field_' + Date.now().toString(36),
                            label: '',
                            type: 'text',
                            required: true,
                          },
                        ])
                      }
                    >
                      + Add Field
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {catFields.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--surface-secondary)',
                          padding: 12,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                        }}
                      >
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
                          <select
                            className="form-select"
                            style={{ flex: 1.2 }}
                            value={f.type}
                            onChange={(e) => {
                              const updated = [...catFields];
                              updated[idx].type = e.target.value as any;
                              setCatFields(updated);
                            }}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Dropdown</option>
                            <option value="textarea">Notes</option>
                          </select>
                          <select
                            className="form-select"
                            style={{ flex: 1 }}
                            value={f.required ? 'true' : 'false'}
                            onChange={(e) => {
                              const updated = [...catFields];
                              updated[idx].required = e.target.value === 'true';
                              setCatFields(updated);
                            }}
                          >
                            <option value="true">Required</option>
                            <option value="false">Optional</option>
                          </select>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)', fontSize: 16 }}
                            onClick={() => {
                              setCatFields(catFields.filter((_, i) => i !== idx));
                            }}
                          >
                            &times;
                          </button>
                        </div>

                        {f.type === 'select' && (
                          <div style={{ marginTop: 8 }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Comma-separated options (e.g. IPS, OLED, VA)"
                              style={{ fontSize: 12, padding: '6px 10px' }}
                              value={f.options || ''}
                              onChange={(e) => {
                                const updated = [...catFields];
                                updated[idx].options = e.target.value;
                                setCatFields(updated);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button type="button" className="btn btn-ghost" onClick={() => setActiveScreen('categories')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Category
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
