// PricingTab — per-tab pricing editor.
//
// Each pricing TAB is an independent table with its own categories (price
// tiers). A tier belongs to exactly one tab via `tier.tab` ('' = the base
// table). A tab may optionally carry a second price column (tier.amountSecondary)
// for same-product channel pricing, e.g. "At the Door" vs "Online". Each tier
// can also have date-based (early-bird) discounts.
//
// Saving: "Save Pricing Tiers" PUTs every tier across all tabs (so adds,
// edits, removals and tab moves all persist together). "Save Prices & Dates"
// PUTs every discount, replacing the editing tab's dated discounts while
// carrying the other tabs' discounts through untouched.

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, IconButton, Button, FormHelperText, Card, CardContent, Divider, Tooltip, Tabs, Tab, FormControlLabel, Checkbox } from '@mui/material';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PriceTier, PriceDiscount, PricingTabData, PricingTabSchema } from '@/lib/validators';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PricingHelperDialog, { type PriceTableResult } from './PricingHelperDialog';

export interface TabSettings {
  baseChannelLabel: string;
  channelOrder: string;        // JSON array of tab labels
  channelsSameProduct: string; // legacy, unused
  secondaryChannelLabel: string;
}

interface PricingTabProps {
  conventionId?: string;
  value: PricingTabData;
  onChange: (data: PricingTabData) => void;
  disabled?: boolean;
  currency: string;
  timezone?: string;
  conventionStartDate?: string | Date | null;
  tabSettings?: TabSettings;
  onTabSettingsChange?: (next: Partial<TabSettings>) => void;
}

export const PricingTab: React.FC<PricingTabProps> = ({ conventionId, value, onChange, disabled = false, currency, tabSettings, onTabSettingsChange }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tiersSaved, setTiersSaved] = useState(false);
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [isSavingDiscounts, setIsSavingDiscounts] = useState(false);
  const [editingTab, setEditingTab] = useState<string>('');

  const baseTabLabel = tabSettings?.baseChannelLabel?.trim() || 'Standard';
  const secondaryLabel = tabSettings?.secondaryChannelLabel?.trim() || 'Online';
  const tabLabel = (t: string) => (t === '' ? baseTabLabel : t);

  // Distinct tabs present in the tier data, ordered by the channelOrder setting
  // when available, else first-seen. Always at least the base ('') tab.
  const tabValues = useMemo(() => {
    const vals: string[] = [];
    for (const t of value.priceTiers) {
      const tab = (t as any).tab || '';
      if (!vals.includes(tab)) vals.push(tab);
    }
    if (vals.length === 0) vals.push('');
    try {
      const order: string[] = JSON.parse(tabSettings?.channelOrder || '[]');
      if (Array.isArray(order) && order.length) {
        const rank = (t: string) => {
          const i = order.indexOf(tabLabel(t));
          return i === -1 ? Number.MAX_SAFE_INTEGER : i;
        };
        vals.sort((a, b) => rank(a) - rank(b));
      }
    } catch { /* keep first-seen */ }
    return vals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.priceTiers, tabSettings?.channelOrder, baseTabLabel]);

  // Keep editingTab valid as tabs change.
  useEffect(() => {
    if (!tabValues.includes(editingTab)) setEditingTab(tabValues[0] ?? '');
  }, [tabValues, editingTab]);

  // The tiers belonging to the currently-edited tab, in order.
  const tabTiers = useMemo(
    () => value.priceTiers
      .filter(t => ((t as any).tab || '') === editingTab)
      .sort((a, b) => a.order - b.order),
    [value.priceTiers, editingTab]
  );
  const isTwoColumn = tabTiers.some(t => (t as any).amountSecondary !== null && (t as any).amountSecondary !== undefined);
  const editingTabTierIds = tabTiers.map(t => t.id).filter(Boolean) as string[];

  // Replace the editing tab's tiers within the full list, re-indexing their order.
  const commitTabTiers = (nextTabTiers: PriceTier[]) => {
    const others = value.priceTiers.filter(t => ((t as any).tab || '') !== editingTab);
    const reindexed = nextTabTiers.map((t, i) => ({ ...t, order: i, tab: editingTab } as PriceTier));
    onChange({ ...value, priceTiers: [...others, ...reindexed] });
  };

  // --- Date discount UI state (scoped to the editing tab's tiers) ---
  const [discountDatePickers, setDiscountDatePickers] = useState<
    Array<{ date: Date | null; tempId: string; tierDiscounts: Array<{ priceTierId: string; label: string; amount: string; originalDiscountId?: string }> }>
  >([]);

  useEffect(() => {
    const savedTabTiers = tabTiers.filter(t => t.id);
    if (savedTabTiers.length === 0) { setDiscountDatePickers([]); return; }
    const tierIdSet = new Set(savedTabTiers.map(t => t.id));

    const groupedByDate: Record<string, PriceDiscount[]> = {};
    value.priceDiscounts.forEach(d => {
      if (!tierIdSet.has(d.priceTierId)) return; // only this tab's discounts
      if (!d.cutoffDate) return;
      const dt = new Date(d.cutoffDate);
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      (groupedByDate[key] = groupedByDate[key] || []).push(d);
    });

    const groups = Object.entries(groupedByDate).map(([key, discountsOnDate], index) => {
      const [y, m, day] = key.split('-').map(Number);
      return {
        date: new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0)),
        tempId: `loaded-${key}-${index}`,
        tierDiscounts: savedTabTiers.map(tier => {
          const existing = discountsOnDate.find(d => d.priceTierId === tier.id);
          return { priceTierId: tier.id!, label: tier.label, amount: existing ? String(existing.discountedAmount) : '', originalDiscountId: existing?.id };
        }),
      };
    });
    setDiscountDatePickers(groups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.priceTiers, value.priceDiscounts, editingTab]);

  useEffect(() => {
    setTiersSaved(value.priceTiers.length > 0 && value.priceTiers.every(t => t.id));
  }, [value.priceTiers]);

  // --- Tier editing (scoped to editing tab) ---
  const handleAddTier = () => {
    const newTier: PriceTier = { label: '', amount: 0, order: tabTiers.length, tab: editingTab } as PriceTier;
    if (isTwoColumn) (newTier as any).amountSecondary = 0;
    commitTabTiers([...tabTiers, newTier]);
  };

  const handleRemoveTier = (idx: number) => {
    const removedId = tabTiers[idx]?.id;
    const next = tabTiers.filter((_, i) => i !== idx);
    let discounts = value.priceDiscounts;
    if (removedId) discounts = value.priceDiscounts.filter(d => d.priceTierId !== removedId);
    const others = value.priceTiers.filter(t => ((t as any).tab || '') !== editingTab);
    onChange({ ...value, priceTiers: [...others, ...next.map((t, i) => ({ ...t, order: i, tab: editingTab }))], priceDiscounts: discounts });
  };

  const handleTierChange = (idx: number, field: keyof PriceTier | 'amountSecondary', val: any) => {
    const next = tabTiers.map((t, i) => (i === idx ? { ...t, [field]: val } : t));
    commitTabTiers(next as PriceTier[]);
  };

  const handleTierReorder = (result: DropResult) => {
    if (!result.destination) return;
    const arr = Array.from(tabTiers);
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);
    commitTabTiers(arr);
  };

  const toggleTwoColumn = (on: boolean) => {
    const next = tabTiers.map(t => ({ ...t, amountSecondary: on ? ((t as any).amountSecondary ?? Number(t.amount)) : null }));
    commitTabTiers(next as PriceTier[]);
  };

  // --- Tab management ---
  const recomputeChannelOrder = (vals: string[]) => {
    onTabSettingsChange?.({ channelOrder: JSON.stringify(vals.map(tabLabel)) });
  };

  // Persist a new tab order immediately so the public page reflects it without
  // a separate save click.
  const persistTabOrder = async (orderedLabels: string[]) => {
    onTabSettingsChange?.({ channelOrder: JSON.stringify(orderedLabels) });
    if (!conventionId) return;
    try {
      const res = await fetch(`/api/organizer/conventions/${conventionId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseChannelLabel: tabSettings?.baseChannelLabel || '',
          secondaryChannelLabel: tabSettings?.secondaryChannelLabel || '',
          channelOrder: JSON.stringify(orderedLabels),
        }),
      });
      if (!res.ok) throw new Error('save failed');
      enqueueSnackbar('Tab order saved.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save tab order.', { variant: 'error' });
    }
  };

  const moveTab = (dir: -1 | 1) => {
    const idx = tabValues.indexOf(editingTab);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= tabValues.length) return;
    const next = [...tabValues];
    [next[idx], next[target]] = [next[target], next[idx]];
    persistTabOrder(next.map(tabLabel));
  };

  const handleAddTab = () => {
    const name = window.prompt('New pricing tab name (e.g. Online, Daily, Weekend):')?.trim();
    if (!name) return;
    if (name === baseTabLabel || tabValues.includes(name)) {
      enqueueSnackbar('That tab name is already in use.', { variant: 'warning' });
      return;
    }
    // Seed the new tab with copies of the first tab's category names (editable,
    // not persisted until saved). Prices start at 0.
    const seedFrom = value.priceTiers
      .filter(t => ((t as any).tab || '') === (tabValues[0] ?? ''))
      .sort((a, b) => a.order - b.order);
    const seeded: PriceTier[] = seedFrom.map((t, i) => ({ label: t.label, amount: 0, order: i, tab: name } as PriceTier));
    onChange({ ...value, priceTiers: [...value.priceTiers, ...seeded] });
    recomputeChannelOrder([...tabValues, name]);
    setEditingTab(name);
    enqueueSnackbar(`Added "${name}" tab. Adjust the categories and prices, then Save Pricing Tiers.`, { variant: 'info' });
  };

  const handleRemoveTab = (tab: string) => {
    const removedIds = value.priceTiers.filter(t => ((t as any).tab || '') === tab).map(t => t.id).filter(Boolean) as string[];
    const remainingTiers = value.priceTiers.filter(t => ((t as any).tab || '') !== tab);
    const remainingDiscounts = value.priceDiscounts.filter(d => !removedIds.includes(d.priceTierId));
    onChange({ ...value, priceTiers: remainingTiers, priceDiscounts: remainingDiscounts });
    recomputeChannelOrder(tabValues.filter(t => t !== tab));
    setEditingTab(tabValues.filter(t => t !== tab)[0] ?? '');
  };

  const handleRenameTab = (oldName: string, rawNew: string) => {
    const newName = rawNew.trim();
    if (!newName || newName === oldName) return;
    if (newName === baseTabLabel || tabValues.includes(newName)) {
      enqueueSnackbar('That tab name is already in use.', { variant: 'warning' });
      return;
    }
    onChange({
      ...value,
      priceTiers: value.priceTiers.map(t => (((t as any).tab || '') === oldName ? { ...t, tab: newName } : t)),
    });
    recomputeChannelOrder(tabValues.map(t => (t === oldName ? newName : t)));
    setEditingTab(newName);
  };

  const handleSaveTabSettings = async () => {
    if (!conventionId) return;
    try {
      const res = await fetch(`/api/organizer/conventions/${conventionId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseChannelLabel: tabSettings?.baseChannelLabel || '',
          channelOrder: tabSettings?.channelOrder || '',
          secondaryChannelLabel: tabSettings?.secondaryChannelLabel || '',
        }),
      });
      if (!res.ok) throw new Error('save failed');
      enqueueSnackbar('Pricing tab settings saved.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save pricing tab settings.', { variant: 'error' });
    }
  };

  // --- Saving tiers / discounts ---
  const isTierValid = (tier: PriceTier) => tier.label.trim().length > 0;
  const canSaveTiers = value.priceTiers.some(isTierValid);

  const handleSaveTiers = async () => {
    if (!conventionId) { setErrors(p => ({ ...p, global: 'Convention ID is missing.' })); return; }
    if (!canSaveTiers) return;
    setIsSavingTiers(true);
    setErrors(p => { const { global, ...rest } = p; return rest; });
    try {
      const tiersToSave = value.priceTiers.filter(isTierValid).map(t => ({
        ...t,
        amount: Number(t.amount),
        tab: (t as any).tab || '',
        amountSecondary: (t as any).amountSecondary == null ? null : Number((t as any).amountSecondary),
      }));
      const response = await fetch(`/api/conventions/${conventionId}/pricing/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceTiers: tiersToSave }),
      });
      if (!response.ok) {
        const err = await response.json();
        setErrors(p => ({ ...p, global: err.message || 'An error occurred while saving tiers.' }));
        throw new Error(err.message || 'Failed to save price tiers');
      }
      const saved: PriceTier[] = await response.json();
      onChange({ ...value, priceTiers: saved.map((t, i) => ({ ...t, order: t.order ?? i })) });
      setTiersSaved(true);
      enqueueSnackbar('Pricing tiers saved.', { variant: 'success' });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('Failed to save'))) {
        setErrors(p => ({ ...p, global: 'An unexpected network error occurred.' }));
      }
    } finally {
      setIsSavingTiers(false);
    }
  };

  const handleSaveDiscounts = async () => {
    if (!conventionId) { setErrors(p => ({ ...p, global: 'Convention ID is missing for discounts.' })); return; }
    if (!tiersSaved) { setErrors(p => ({ ...p, global: 'Please save Price Tiers before saving discounts.' })); return; }

    const discountsToSaveApi: Omit<PriceDiscount, 'id' | 'conventionId'>[] = [];
    // The editing tab's dated discounts (from the pickers).
    discountDatePickers.forEach(group => {
      if (!group.date) return;
      const d = new Date(group.date);
      const cutoff = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      group.tierDiscounts.forEach(td => {
        const amt = parseFloat(td.amount);
        if (td.amount.trim() !== '' && !isNaN(amt) && amt >= 0 && td.priceTierId) {
          discountsToSaveApi.push({ cutoffDate: cutoff, priceTierId: td.priceTierId, discountedAmount: amt, channel: '' });
        }
      });
    });
    // Carry over every other tab's discounts untouched.
    const editingSet = new Set(editingTabTierIds);
    value.priceDiscounts
      .filter(d => !editingSet.has(d.priceTierId))
      .forEach(d => discountsToSaveApi.push({ cutoffDate: new Date(d.cutoffDate), priceTierId: d.priceTierId, discountedAmount: Number(d.discountedAmount), channel: '' }));

    setIsSavingDiscounts(true);
    setErrors(p => { const { global, ...rest } = p; return rest; });
    try {
      const response = await fetch(`/api/conventions/${conventionId}/pricing/discounts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceDiscounts: discountsToSaveApi }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(p => ({ ...p, global: data.message || data.error || 'An error occurred while saving discounts.' }));
        throw new Error(data.message || data.error || 'Failed to save price discounts');
      }
      onChange({ ...value, priceDiscounts: data });
      enqueueSnackbar('Prices & dates saved.', { variant: 'success' });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('Failed to save'))) {
        setErrors(p => ({ ...p, global: 'An unexpected network error occurred while saving discounts.' }));
      }
    } finally {
      setIsSavingDiscounts(false);
    }
  };

  const handleAddDiscountDateGroup = () => {
    const savedTabTiers = tabTiers.filter(t => t.id);
    if (savedTabTiers.length === 0) {
      setErrors(p => ({ ...p, global: 'Save this tab’s categories before adding discount dates.' }));
      return;
    }
    setDiscountDatePickers(prev => [...prev, {
      date: null,
      tempId: `new-${Date.now()}`,
      tierDiscounts: savedTabTiers.map(t => ({ priceTierId: t.id!, label: t.label, amount: '' })),
    }]);
  };

  const handleRemoveDiscountDateGroup = (groupIndex: number) => {
    const group = discountDatePickers[groupIndex];
    // Drop the group from the UI; the actual delete persists on Save (the group's
    // dates simply won't be included in the replace-all payload).
    setDiscountDatePickers(prev => prev.filter((_, i) => i !== groupIndex));
    if (group?.date) enqueueSnackbar('Discount date removed — click Save Prices & Dates to apply.', { variant: 'info' });
  };

  const handleDiscountDateChange = (groupIndex: number, newDate: Date | null) => {
    setDiscountDatePickers(prev => prev.map((g, i) => (i === groupIndex ? { ...g, date: newDate } : g)));
  };

  const handleDiscountAmountChange = (groupIndex: number, tdIndex: number, amount: string) => {
    setDiscountDatePickers(prev => prev.map((g, gi) => (gi === groupIndex ? { ...g, tierDiscounts: g.tierDiscounts.map((td, ti) => (ti === tdIndex ? { ...td, amount } : td)) } : g)));
  };

  const validate = () => {
    try { PricingTabSchema.parse(value); setErrors({}); return true; }
    catch (e) {
      if (e instanceof z.ZodError) {
        const fe: Record<string, string> = {};
        e.errors.forEach(err => { if (err.path.length) fe[err.path.join('.')] = err.message; });
        setErrors(fe);
      }
      return false;
    }
  };

  const allTiersSaved = value.priceTiers.length > 0 && value.priceTiers.every(t => t.id);

  const [helperOpen, setHelperOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Remove the convention's entire pricing table. Saving an empty set isn't
  // otherwise reachable (Save needs >=1 valid tier), so this is the one way to
  // delete a table outright. The tiers endpoint treats an empty array as "clear".
  const handleClearPricing = async () => {
    if (!conventionId) return;
    if (!window.confirm('Remove the entire pricing table for this convention? This deletes all categories and their early-bird dates.')) return;
    setIsClearing(true);
    try {
      const res = await fetch(`/api/conventions/${conventionId}/pricing/tiers`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceTiers: [] }),
      });
      if (!res.ok) throw new Error('clear failed');
      onChange({ ...value, priceTiers: [], priceDiscounts: [] });
      setTiersSaved(false);
      enqueueSnackbar('Pricing table removed.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to remove the pricing table.', { variant: 'error' });
    } finally {
      setIsClearing(false);
    }
  };

  // Fill the Pricing tab from a Pricing Helper result (flatten tables -> tiers)
  // AND persist immediately, so accepting the proposal is the save — the organizer
  // never has to remember to click Save and risk losing the import.
  const applyPricing = async (tables: PriceTableResult[], _currency: string | null) => {
    const tiers: PriceTier[] = [];
    let primaryLabel = '';
    let secondaryLabel = '';
    tables.forEach((table) => {
      const tab = table.name || '';
      table.tiers.forEach((t, i) => {
        tiers.push({ label: t.label, amount: t.amount, amountSecondary: t.amountSecondary ?? null, tab, order: i } as PriceTier);
      });
      if (table.secondaryLabel) { primaryLabel = table.primaryLabel || 'At the Door'; secondaryLabel = table.secondaryLabel; }
    });

    // Show the imported table right away.
    onChange({ ...value, priceTiers: tiers, priceDiscounts: [] });
    if (secondaryLabel && onTabSettingsChange) {
      onTabSettingsChange({ baseChannelLabel: primaryLabel, secondaryChannelLabel: secondaryLabel });
    }

    const count = `${tiers.length} categor${tiers.length === 1 ? 'y' : 'ies'}`;
    if (!conventionId) {
      setTiersSaved(false);
      enqueueSnackbar(`Imported ${count}. Review, then click Save Pricing Tiers.`, { variant: 'info' });
      return;
    }

    // Persist the tiers (and channel labels) straight away.
    setIsSavingTiers(true);
    setErrors(p => { const { global, ...rest } = p; return rest; });
    try {
      const tiersToSave = tiers.filter(t => t.label.trim().length > 0).map(t => ({
        ...t,
        amount: Number(t.amount),
        tab: (t as any).tab || '',
        amountSecondary: (t as any).amountSecondary == null ? null : Number((t as any).amountSecondary),
      }));
      const response = await fetch(`/api/conventions/${conventionId}/pricing/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceTiers: tiersToSave }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save price tiers');
      }
      const saved: PriceTier[] = await response.json();
      onChange({ ...value, priceTiers: saved.map((t, i) => ({ ...t, order: t.order ?? i })), priceDiscounts: [] });
      if (secondaryLabel) {
        await fetch(`/api/organizer/conventions/${conventionId}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseChannelLabel: primaryLabel,
            secondaryChannelLabel: secondaryLabel,
            channelOrder: tabSettings?.channelOrder || '',
          }),
        }).catch(() => { /* labels are secondary; tiers already saved */ });
      }
      setTiersSaved(true);
      enqueueSnackbar(`Imported and saved ${count}.`, { variant: 'success' });
    } catch (e) {
      setTiersSaved(false);
      enqueueSnackbar('Imported, but auto-save failed — review and click Save Pricing Tiers.', { variant: 'warning' });
    } finally {
      setIsSavingTiers(false);
    }
  };

  return (
    <Box>
      {conventionId && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setHelperOpen(true)} disabled={disabled}>
            Import pricing from a website or image
          </Button>
        </Box>
      )}
      {conventionId && (
        <PricingHelperDialog
          open={helperOpen}
          onClose={() => setHelperOpen(false)}
          conventionId={conventionId}
          onApplied={applyPricing}
        />
      )}
      {/* Pricing tables (tabs) manager */}
      <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: 'action.hover' }}>
        <Typography variant="h6" gutterBottom>Pricing Tables</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Each tab is its own table with its own categories. Add a tab when attendees pick between
          genuinely different ticket sets (e.g. <em>Weekly</em> vs <em>Daily</em>). For the same ticket at a
          different price by route (e.g. <em>Online</em> vs <em>At the Door</em>), turn on the second price column below.
        </Typography>

        {tabValues.length > 1 && (
          <>
            <Tabs value={editingTab} onChange={(_, v) => setEditingTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}>
              {tabValues.map(t => <Tab key={t || 'base'} value={t} label={tabLabel(t)} />)}
            </Tabs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Tab order:</Typography>
              <Button size="small" startIcon={<KeyboardArrowLeftIcon />} onClick={() => moveTab(-1)} disabled={disabled || tabValues.indexOf(editingTab) <= 0}>
                Move left
              </Button>
              <Button size="small" endIcon={<KeyboardArrowRightIcon />} onClick={() => moveTab(1)} disabled={disabled || tabValues.indexOf(editingTab) >= tabValues.length - 1}>
                Move right
              </Button>
              <Typography variant="caption" color="text.secondary">(applies to the front page immediately)</Typography>
            </Box>
          </>
        )}

        {editingTab === '' ? (
          <TextField
            label="Table name"
            value={tabSettings?.baseChannelLabel || ''}
            onChange={e => onTabSettingsChange?.({ baseChannelLabel: e.target.value })}
            placeholder="e.g. At the Door, Weekly, Standard"
            disabled={disabled}
            sx={{ minWidth: 280, mb: 2 }}
            helperText="Name of the main / default table"
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              key={editingTab}
              label="Tab name"
              defaultValue={editingTab}
              onBlur={e => handleRenameTab(editingTab, e.target.value)}
              disabled={disabled}
              sx={{ minWidth: 240 }}
              helperText="Press tab or click away to apply"
            />
            <Button
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (window.confirm(`Remove the "${editingTab}" tab? All of its categories, prices and discount dates will be permanently deleted when you save.`)) {
                  handleRemoveTab(editingTab);
                }
              }}
              disabled={disabled}
            >
              Remove tab
            </Button>
          </Box>
        )}

        <FormControlLabel
          control={<Checkbox checked={isTwoColumn} onChange={e => toggleTwoColumn(e.target.checked)} disabled={disabled} />}
          label="This table has a second price column (e.g. Online vs At the Door)"
          sx={{ display: 'block', mb: isTwoColumn ? 1 : 0 }}
        />
        {isTwoColumn && (
          <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <TextField
              label="First column label"
              value={tabSettings?.baseChannelLabel || ''}
              onChange={e => onTabSettingsChange?.({ baseChannelLabel: e.target.value })}
              placeholder="At the Door"
              disabled={disabled}
              size="small"
              sx={{ minWidth: 220 }}
            />
            <TextField
              label="Second column label"
              value={tabSettings?.secondaryChannelLabel || ''}
              onChange={e => onTabSettingsChange?.({ secondaryChannelLabel: e.target.value })}
              placeholder="Online"
              disabled={disabled}
              size="small"
              sx={{ minWidth: 220 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddTab} disabled={disabled || !allTiersSaved}>
            Add Pricing Tab
          </Button>
          <Button variant="outlined" size="small" onClick={handleSaveTabSettings} disabled={disabled || !conventionId}>
            Save Tab Settings
          </Button>
        </Box>
        {!allTiersSaved && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Save your categories first, then add tabs.
          </Typography>
        )}
      </Card>

      {/* Categories for the editing tab */}
      <Typography variant="h6" gutterBottom>
        {tabValues.length > 1 ? `${tabLabel(editingTab)} — Categories` : 'Price Categories'}
      </Typography>
      <DragDropContext onDragEnd={handleTierReorder}>
        <Droppable droppableId="tiers-droppable">
          {(provided: DroppableProvided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {tabTiers.map((tier, idx) => (
                <Draggable key={tier.id || `new-tier-${editingTab}-${idx}`} draggableId={tier.id || `new-tier-${editingTab}-${idx}`} index={idx}>
                  {(dragProvided: DraggableProvided) => (
                    <Card ref={dragProvided.innerRef} {...dragProvided.draggableProps} sx={{ mb: 2, opacity: disabled ? 0.7 : 1 }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span {...dragProvided.dragHandleProps} aria-label="Drag to reorder" style={{ cursor: 'grab' }}>
                          <DragIndicatorIcon />
                        </span>
                        <TextField label="Label" value={tier.label} onChange={e => handleTierChange(idx, 'label', e.target.value)} disabled={disabled} sx={{ flexGrow: 1, minWidth: 120 }} inputProps={{ 'aria-label': `Tier label ${idx + 1}` }} />
                        <TextField
                          type="number"
                          label={isTwoColumn ? (tabSettings?.baseChannelLabel || 'Price') : 'Amount'}
                          value={tier.amount}
                          onChange={e => handleTierChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                          sx={{ width: '120px' }}
                          InputProps={{ startAdornment: <Box component="span" sx={{ mr: 1 }}>{currency}</Box> }}
                          disabled={disabled}
                        />
                        {isTwoColumn && (
                          <TextField
                            type="number"
                            label={secondaryLabel}
                            value={(tier as any).amountSecondary ?? ''}
                            onChange={e => handleTierChange(idx, 'amountSecondary', e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
                            sx={{ width: '120px' }}
                            InputProps={{ startAdornment: <Box component="span" sx={{ mr: 1 }}>{currency}</Box> }}
                            disabled={disabled}
                          />
                        )}
                        <Tooltip title="Remove Category">
                          <span>
                            <IconButton aria-label="Remove tier" onClick={() => handleRemoveTier(idx)} disabled={disabled}>
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddTier} disabled={disabled} sx={{ mt: 1 }}>Add Category</Button>
      {errors.global && <FormHelperText error sx={{ mt: 1, textAlign: 'center' }}>{errors.global}</FormHelperText>}

      <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
        {conventionId && value.priceTiers.length > 0 && (
          <Button variant="text" color="error" size="small" onClick={handleClearPricing} disabled={isClearing || disabled}>
            {isClearing ? 'Removing…' : 'Clear pricing'}
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={handleSaveTiers} disabled={!canSaveTiers || isSavingTiers || !conventionId}>
          {isSavingTiers ? 'Saving Tiers...' : 'Save Pricing Tiers'}
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Discount dates for the editing tab */}
      <Box>
        <Typography variant="h6" gutterBottom>
          {tabValues.length > 1 ? `${tabLabel(editingTab)} — Discount Dates` : 'Discount Dates'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set cutoff dates for special pricing (e.g. an &quot;Early Bird&quot; rate). Discounts apply up to 11:59 PM on the selected day in the convention&apos;s timezone.
        </Typography>

        {discountDatePickers.map((group, groupIndex) => (
          <Card key={group.tempId} variant="outlined" sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <DatePicker label="Discount Cutoff Date" value={group.date} onChange={date => handleDiscountDateChange(groupIndex, date)} disabled={disabled} slotProps={{ textField: { error: false, helperText: null } }} />
              <Tooltip title="Remove Discount Date Group">
                <IconButton aria-label="Remove discount date group" onClick={() => handleRemoveDiscountDateGroup(groupIndex)} disabled={disabled}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
            {group.date && (
              <Box sx={{ mt: 2 }}>
                {group.tierDiscounts.map((td, tdIndex) => (
                  <Box key={td.priceTierId} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography sx={{ width: 240, flexShrink: 0 }}>
                      {td.label} ({currency}{value.priceTiers.find(t => t.id === td.priceTierId)?.amount ?? 0})
                    </Typography>
                    <TextField
                      type="number"
                      placeholder="Discount Amount"
                      value={td.amount}
                      onChange={e => handleDiscountAmountChange(groupIndex, tdIndex, e.target.value)}
                      size="small"
                      sx={{ width: '150px' }}
                      InputProps={{ startAdornment: <Box component="span" sx={{ mr: 1 }}>{currency}</Box> }}
                      disabled={disabled}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        ))}

        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddDiscountDateGroup} disabled={disabled || tabTiers.filter(t => t.id).length === 0} sx={{ mt: 1 }}>
          Add Discount Date
        </Button>

        {value.priceTiers.length > 0 && (
          <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="secondary" onClick={handleSaveDiscounts} disabled={isSavingDiscounts || !conventionId || !tiersSaved}>
              {isSavingDiscounts ? 'Saving...' : (tabValues.length > 1 ? `Save ${tabLabel(editingTab)} Prices & Dates` : 'Save Prices & Dates')}
            </Button>
          </Box>
        )}
        {discountDatePickers.length === 0 && tabTiers.filter(t => t.id).length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            No discount dates for this tab yet. Click &quot;Add Discount Date&quot; to create one.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
