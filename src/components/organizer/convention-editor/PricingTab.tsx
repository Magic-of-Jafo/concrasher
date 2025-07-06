// DEVELOPER NOTE: PricingTab - Pricing & Discount Flow Guidance
//
// - Organizer defines any number of Price Tiers (label, amount, order). Labels are freeform but common ones include: Regular, Spouse, Youth, Parent or Guardian of Youth. Tiers can be added, removed, edited, and reordered (drag-and-drop). Any tier can have any price.
// - Tiers must be saved before discounts can be configured. Discounts are tied to the DB record of a specific Price Tier.
// - Discounts are date-based (cutoff date). For each discount date, the Organizer can set discounted prices for any subset of tiers (no duplicate tier per date).
// - The UI flow: After saving tiers, Organizer adds a Discount Date. For each date, a row for each tier appears. If a discount price is entered for a tier, that discount is active for that date/tier. Blank fields mean no discount for that tier/date.
// - Organizer can add as many discount dates as desired. Each date creates a new set of rows for all tiers. Only filled-in discount fields are saved/applied.
// - This note is a reference for all PricingTab logic and should be consulted for future changes.
//

// NOTE: Requires @hello-pangea/dnd to be installed for drag-and-drop functionality.
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, Button, Select, MenuItem, InputLabel, FormControl, FormHelperText, Card, CardContent, Divider, Tooltip } from '@mui/material';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PriceTier, PriceDiscount, PricingTabData, PriceTierSchema, PriceDiscountSchema, PricingTabSchema } from '@/lib/validators';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

interface PricingTabProps {
  conventionId?: string;
  value: PricingTabData;
  onChange: (data: PricingTabData) => void;
  disabled?: boolean;
  currency?: string; // e.g. '$', '€', etc.
  timezone?: string; // IANA timezone identifier for the convention
}

const defaultCurrency = '$';

export const PricingTab: React.FC<PricingTabProps> = ({ conventionId, value, onChange, disabled = false, currency = defaultCurrency, timezone }) => {
  // --- CONSOLE LOGS FOR DEBUGGING ---
  // console.log('[PricingTab] Render. conventionId:', conventionId); // Removed for brevity
  // console.log('[PricingTab] Render. value.priceTiers:', JSON.stringify(value.priceTiers)); // Removed for brevity
  // console.log('[PricingTab] Render. value.priceDiscounts:', JSON.stringify(value.priceDiscounts)); // Removed for brevity
  // --- END CONSOLE LOGS ---

  const { enqueueSnackbar } = useSnackbar();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tiersSaved, setTiersSaved] = useState(false);
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [isSavingDiscounts, setIsSavingDiscounts] = useState(false);

  const [discountDatePickers, setDiscountDatePickers] = useState<
    Array<{
      date: Date | null;
      tempId: string; // For React key
      tierDiscounts: Array<{
        priceTierId: string; // ID of the PriceTier this discount applies to
        label: string; // Label of the PriceTier (for display)
        amount: string; // The discounted amount as a string from input
        originalDiscountId?: string; // ID of existing PriceDiscount if this is loaded data
      }>
    }>
  >([]);

  useEffect(() => {
    console.log('[PricingTab] useEffect for discountDatePickers triggered.');
    console.log('[PricingTab] useEffect - using value.priceDiscounts:', JSON.stringify(value.priceDiscounts));

    if (value.priceTiers.length === 0) {
      setDiscountDatePickers([]);
      return;
    }

    const groupedByDate: Record<string, PriceDiscount[]> = {};
    value.priceDiscounts.forEach(discount => {
      if (discount.cutoffDate) {
        const utcDateFromDB = new Date(discount.cutoffDate); // This is a UTC timestamp
        // Use UTC components to form the key, ensuring consistency
        const dateKey = `${utcDateFromDB.getUTCFullYear()}-${String(utcDateFromDB.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDateFromDB.getUTCDate()).padStart(2, '0')}`;

        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(discount);
      }
    });

    const newUIDiscountGroups = Object.entries(groupedByDate).map(([dateStrKey_YYYY_MM_DD_UTC, discountsOnDate], index) => {
      const [year, month_1_indexed, day] = dateStrKey_YYYY_MM_DD_UTC.split('-').map(Number);

      // Create a Date object that represents the correct date regardless of timezone
      // The key is to create a Date object that when displayed will show the correct date
      // We create it at noon UTC to avoid timezone boundary issues
      const dateForPicker = new Date(Date.UTC(year, month_1_indexed - 1, day, 12, 0, 0, 0));

      return {
        date: dateForPicker, // DatePicker receives a date object representing the correct day
        tempId: `loaded-dategroup-${dateStrKey_YYYY_MM_DD_UTC}-${index}`,
        tierDiscounts: value.priceTiers.filter(t => t.id).map(tier => {
          const existingDiscount = discountsOnDate.find(d => d.priceTierId === tier.id);
          return {
            priceTierId: tier.id!,
            label: tier.label,
            amount: existingDiscount ? String(existingDiscount.discountedAmount) : '',
            originalDiscountId: existingDiscount?.id,
          };
        }),
      };
    });

    setDiscountDatePickers(newUIDiscountGroups);
  }, [value.priceTiers, value.priceDiscounts]);

  useEffect(() => {
    if (value.priceTiers.length > 0 && value.priceTiers.every(tier => tier.id)) {
      setTiersSaved(true);
    } else {
      setTiersSaved(false); // Reset if tiers are removed or not saved
    }
  }, [value.priceTiers]);

  const handleAddTier = () => {
    const newTier: PriceTier = {
      label: '',
      amount: 0,
      order: value.priceTiers.length,
    };
    onChange({ ...value, priceTiers: [...value.priceTiers, newTier] });
  };

  const handleRemoveTier = (idx: number) => {
    const removedTierId = value.priceTiers[idx]?.id;
    const newTiers = value.priceTiers.filter((_, i) => i !== idx).map((tier, i) => ({ ...tier, order: i }));
    let newMasterDiscounts = value.priceDiscounts;
    if (removedTierId) {
      newMasterDiscounts = value.priceDiscounts.filter(d => d.priceTierId !== removedTierId);
    }
    onChange({ ...value, priceTiers: newTiers, priceDiscounts: newMasterDiscounts });
  };

  const handleTierChange = (idx: number, field: keyof PriceTier, val: any) => {
    const newTiers = value.priceTiers.map((tier, i) => i === idx ? { ...tier, [field]: val } : tier);
    onChange({ ...value, priceTiers: newTiers });
  };

  const handleTierReorder = (result: DropResult) => {
    if (!result.destination) return;
    const tiers = Array.from(value.priceTiers);
    const [removed] = tiers.splice(result.source.index, 1);
    tiers.splice(result.destination.index, 0, removed);
    const reordered = tiers.map((tier, i) => ({ ...tier, order: i }));
    onChange({ ...value, priceTiers: reordered });
  };

  const handleAddDiscountDateGroup = () => {
    if (!value.priceTiers.every(t => t.id)) {
      setErrors(prev => ({ ...prev, global: "All tiers must be saved before adding discount dates." }));
      return;
    }
    setDiscountDatePickers(prev => [
      ...prev,
      {
        date: null,
        tempId: `new-dategroup-${Date.now()}`,
        tierDiscounts: value.priceTiers.filter(t => t.id).map(tier => ({ // Only for saved tiers
          priceTierId: tier.id!,
          label: tier.label,
          amount: '',
        })),
      },
    ]);
  };

  const handleRemoveDiscountDateGroup = async (groupIndex: number) => {
    const groupToRemove = discountDatePickers[groupIndex];
    console.log(`[PricingTab] TRASH ICON CLICKED for discount date groupIndex: ${groupIndex}`, groupToRemove ? { date: groupToRemove.date, tempId: groupToRemove.tempId, tierDiscountCount: groupToRemove.tierDiscounts.length } : 'GROUP NOT FOUND');
    if (!groupToRemove) {
      console.warn('[PricingTab] handleRemoveDiscountDateGroup: No group found for index.');
      return;
    }

    if (groupToRemove.date && conventionId) {
      // groupToRemove.date is now a Date object representing midnight UTC of the selected day
      const dateForAPI = groupToRemove.date;

      const year = dateForAPI.getUTCFullYear();
      const month = (dateForAPI.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = dateForAPI.getUTCDate().toString().padStart(2, '0');
      const cutoffDateStringForAPI = `${year}-${month}-${day}`;

      console.log(`[PricingTab] API CALL to delete discounts for conventionId: ${conventionId}, cutoffDateString (UTC for API): ${cutoffDateStringForAPI}`);
      // console.log(`[PricingTab] Original local date: ${localDate.toLocaleString()}, UTC date: ${utcDate.toISOString()}`); // No longer have a distinct localDate here if dateForAPI is UTC
      console.log(`[PricingTab] groupToRemove.date (should be UTC midnight): ${groupToRemove.date.toISOString()}`);

      const wasSaving = isSavingDiscounts;
      setIsSavingDiscounts(true);

      try {
        const response = await fetch(`/api/conventions/${conventionId}/pricing/discounts-by-date?cutoffDate=${cutoffDateStringForAPI}`, {
          method: 'DELETE',
        });
        console.log('[PricingTab] API response status:', response.status);
        const responseData = await response.json();
        console.log('[PricingTab] API response data:', responseData);

        if (!response.ok) {
          enqueueSnackbar(responseData.message || 'Failed to delete discount date group.', { variant: 'error' });
          throw new Error(responseData.message || 'Failed to delete discount date group');
        }

        enqueueSnackbar(responseData.message || 'Discount date group cleared.', { variant: 'success' });

        console.log('[PricingTab] BEFORE filtering value.priceDiscounts:', JSON.stringify(value.priceDiscounts));
        const updatedPriceDiscounts = value.priceDiscounts.filter(discount => {
          if (!discount.cutoffDate) return true;

          const dbDateUTC = new Date(discount.cutoffDate);
          const dbYear = dbDateUTC.getUTCFullYear();
          const dbMonth = (dbDateUTC.getUTCMonth() + 1).toString().padStart(2, '0');
          const dbDay = dbDateUTC.getUTCDate().toString().padStart(2, '0');
          const dbDateStringToCompare = `${dbYear}-${dbMonth}-${dbDay}`;

          console.log(`[PricingTab] Comparing dates - Target for API: ${cutoffDateStringForAPI}, DB Date for comparison: ${dbDateStringToCompare}`);
          const shouldKeep = dbDateStringToCompare !== cutoffDateStringForAPI;
          return shouldKeep;
        });
        console.log('[PricingTab] AFTER filtering, updatedPriceDiscounts:', JSON.stringify(updatedPriceDiscounts));
        onChange({ ...value, priceDiscounts: updatedPriceDiscounts });
        console.log('[PricingTab] onChange called with updated discounts.');

      } catch (error) {
        if (!(error instanceof Error && error.message.includes('Failed to delete'))) {
          console.error('Error in handleRemoveDiscountDateGroup:', error);
          enqueueSnackbar('An unexpected error occurred.', { variant: 'error' });
        }
      } finally {
        setIsSavingDiscounts(wasSaving);
      }
    } else {
      // If there's no date or no conventionId, just remove locally from UI state (if it was a purely new, unsaved group)
      // This path might be less common now if we expect a date to be set to enable deletion.
      // For consistency, this local-only removal should also be handled by the useEffect if possible,
      // but a new, empty group with no date wouldn't have discounts in value.priceDiscounts to filter out.
      // So, if it's a purely UI-only new group (no date set), direct removal from discountDatePickers is fine.
      if (!groupToRemove.date) {
        setDiscountDatePickers(prev => prev.filter((_, idx) => idx !== groupIndex));
        enqueueSnackbar('New discount date entry removed locally.', { variant: 'info' });
        console.log('[PricingTab] Removed new, date-less group locally.');
      } else {
        // This case (groupToRemove.date exists but no conventionId) should ideally not happen for a delete action.
        // If it does, a local removal might be okay, but it implies an inconsistent state.
        enqueueSnackbar('Cannot delete from server: Convention ID missing. Group removed locally.', { variant: 'warning' });
        setDiscountDatePickers(prev => prev.filter((_, idx) => idx !== groupIndex));
        console.warn('[PricingTab] Group had a date but no conventionId for API call. Removed locally.');
      }
    }
  };

  const handleDiscountDateChange = (groupIndex: number, newDate: Date | null) => {
    setDiscountDatePickers(prev =>
      prev.map((group, idx) =>
        idx === groupIndex ? { ...group, date: newDate } : group
      )
    );
  };

  const handleDiscountAmountChange = (groupIndex: number, tierDiscountIndex: number, amount: string) => {
    setDiscountDatePickers(prev =>
      prev.map((group, gIdx) =>
        gIdx === groupIndex
          ? {
            ...group,
            tierDiscounts: group.tierDiscounts.map((td, tdIdx) =>
              tdIdx === tierDiscountIndex ? { ...td, amount } : td
            ),
          }
          : group
      )
    );
  };

  const handleDeleteIndividualDiscount = async (originalDiscountId: string) => {
    if (!conventionId) {
      enqueueSnackbar('Convention ID is missing. Cannot delete discount.', { variant: 'error' });
      return;
    }
    if (!originalDiscountId) {
      enqueueSnackbar('Discount ID is missing. Cannot delete discount.', { variant: 'error' });
      return;
    }

    setIsSavingDiscounts(true);
    try {
      const response = await fetch(`/api/conventions/${conventionId}/pricing/discounts/${originalDiscountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorData = { message: 'Failed to delete discount. Unknown error.' };
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if response is not json
        }
        enqueueSnackbar(errorData.message || 'Failed to delete discount.', { variant: 'error' });
        throw new Error(errorData.message || 'Failed to delete discount');
      }

      enqueueSnackbar('Discount deleted successfully.', { variant: 'success' });

      const updatedPriceDiscounts = value.priceDiscounts.filter(d => d.id !== originalDiscountId);
      onChange({ ...value, priceDiscounts: updatedPriceDiscounts });

    } catch (error) {
      // Error already enqueued if it's an API error parsed above
      if (!(error instanceof Error && error.message.includes('Failed to delete discount'))) {
        console.error('Error in handleDeleteIndividualDiscount:', error); // Log other errors
        enqueueSnackbar('An unexpected error occurred while deleting the discount.', { variant: 'error' });
      }
    } finally {
      setIsSavingDiscounts(false);
    }
  };

  const isTierValid = (tier: PriceTier) => tier.label.trim().length > 0;
  const canSaveTiers = value.priceTiers.some(isTierValid);
  console.log('[PricingTab] Render. canSaveTiers:', canSaveTiers);

  const handleSaveTiers = async () => {
    if (!conventionId) {
      console.error('Convention ID is missing, cannot save tiers.');
      setErrors(prev => ({ ...prev, global: 'Convention ID is missing. Cannot save pricing tiers.' }));
      return;
    }
    if (!canSaveTiers) return;

    setIsSavingTiers(true);
    setErrors(prev => { const { global, ...rest } = prev; return rest; });

    try {
      const tiersToSave = value.priceTiers.filter(isTierValid).map(tier => ({ ...tier, amount: Number(tier.amount) }));
      const response = await fetch(`/api/conventions/${conventionId}/pricing/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceTiers: tiersToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save price tiers:', errorData);
        setErrors(prev => ({ ...prev, global: errorData.message || 'An error occurred while saving tiers.' }));
        throw new Error(errorData.message || 'Failed to save price tiers');
      }
      const savedTiersWithIds: PriceTier[] = await response.json();
      onChange({
        ...value,
        priceTiers: savedTiersWithIds.map((tier, index) => ({ ...tier, order: tier.order ?? index }))
      });
      setTiersSaved(true);
      console.log('Price tiers saved successfully:', savedTiersWithIds);
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('Failed to save'))) {
        console.error('Error in handleSaveTiers:', error);
        setErrors(prev => ({ ...prev, global: 'An unexpected network error occurred.' }));
      }
    } finally {
      setIsSavingTiers(false);
    }
  };

  const handleSaveDiscounts = async () => {
    if (!conventionId) {
      console.error('Convention ID is missing, cannot save discounts.');
      setErrors(prev => ({ ...prev, global: 'Convention ID is missing for discounts.' }));
      return;
    }
    if (!tiersSaved) {
      console.warn('Tiers must be saved before saving discounts.');
      setErrors(prev => ({ ...prev, global: 'Please save Price Tiers before saving discounts.' }));
      return;
    }

    const discountsToSaveApi: Omit<PriceDiscount, 'id' | 'conventionId'>[] = [];
    discountDatePickers.forEach(group => {
      if (group.date) {
        // group.date from DatePicker. If DatePicker value was set as UTC midnight,
        // and user selects a day, DatePicker might return a Date object representing that day in local time.
        // We must convert this to UTC midnight for storage.
        const localDateFromPicker = new Date(group.date);
        const dateToSendToDB = new Date(Date.UTC(localDateFromPicker.getFullYear(), localDateFromPicker.getMonth(), localDateFromPicker.getDate()));

        group.tierDiscounts.forEach(td => {
          const amountNum = parseFloat(td.amount);
          if (td.amount.trim() !== '' && !isNaN(amountNum) && amountNum >= 0 && td.priceTierId) {
            discountsToSaveApi.push({
              cutoffDate: dateToSendToDB, // Ensure this is the UTC midnight representation
              priceTierId: td.priceTierId,
              discountedAmount: amountNum,
            });
          }
        });
      }
    });

    if (discountsToSaveApi.length === 0 && value.priceDiscounts.filter(d => discountDatePickers.flatMap(ddp => ddp.tierDiscounts).find(td => td.originalDiscountId === d.id)).length === 0) {
      if (value.priceDiscounts.length === 0) {
        console.log('No discounts to save or clear.');
        return;
      }
    }

    setIsSavingDiscounts(true);
    setErrors(prev => { const { global, ...rest } = prev; return rest; });

    console.log('[PricingTab] handleSaveDiscounts - Convention ID:', conventionId);
    console.log('[PricingTab] handleSaveDiscounts - Tiers Saved:', tiersSaved);
    console.log('[PricingTab] handleSaveDiscounts - Discounts to send to API (discountsToSaveApi):', JSON.stringify(discountsToSaveApi, null, 2));

    try {
      const response = await fetch(`/api/conventions/${conventionId}/pricing/discounts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceDiscounts: discountsToSaveApi }),
      });

      const responseData = await response.json();
      console.log('[PricingTab] handleSaveDiscounts - API Response Status:', response.status);
      console.log('[PricingTab] handleSaveDiscounts - API Response Data:', responseData);

      if (!response.ok) {
        console.error('Failed to save price discounts (client-side check):', responseData);
        setErrors(prev => ({ ...prev, global: responseData.message || responseData.error || 'An error occurred while saving discounts.' }));
        throw new Error(responseData.message || responseData.error || 'Failed to save price discounts');
      }
      onChange({ ...value, priceDiscounts: responseData });
      console.log('Price discounts saved successfully (client-side):', responseData);
    } catch (error: any) {
      if (!(error instanceof Error && error.message.includes('Failed to save'))) {
        console.error('Error in handleSaveDiscounts:', error);
        setErrors(prev => ({ ...prev, global: 'An unexpected network error occurred while saving discounts.' }));
      }
    } finally {
      setIsSavingDiscounts(false);
    }
  };

  const canSaveDiscounts = discountDatePickers.some(group =>
    group.date && group.tierDiscounts.some(td => td.amount.trim() !== '' && !isNaN(parseFloat(td.amount)))
  ) || (discountDatePickers.length > 0 && value.priceDiscounts.length > 0 && !discountDatePickers.some(group => group.date && group.tierDiscounts.some(td => td.amount.trim() !== '' && !isNaN(parseFloat(td.amount))))); // True if there are entered discounts OR if there are saved discounts and UI implies clearing them

  const validate = () => {
    try {
      PricingTabSchema.parse(value);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        e.errors.forEach(err => {
          if (err.path.length > 0) {
            fieldErrors[err.path.join('.')] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Price Tiers</Typography>
      <DragDropContext onDragEnd={handleTierReorder}>
        <Droppable droppableId="tiers-droppable">
          {(provided: DroppableProvided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {value.priceTiers.map((tier, idx) => (
                <Draggable key={tier.id || `new-tier-${idx}`} draggableId={tier.id || `new-tier-${idx}`} index={idx}>
                  {(dragProvided: DraggableProvided) => (
                    <Card ref={dragProvided.innerRef} {...dragProvided.draggableProps} sx={{ mb: 2, opacity: disabled ? 0.7 : 1 }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span {...dragProvided.dragHandleProps} aria-label="Drag to reorder" style={{ cursor: 'grab' }}>
                          <DragIndicatorIcon />
                        </span>
                        <TextField label="Label" value={tier.label} onChange={e => handleTierChange(idx, 'label', e.target.value)} disabled={disabled} error={!!errors[`priceTiers.${idx}.label`]} helperText={errors[`priceTiers.${idx}.label`]} sx={{ flexGrow: 1, minWidth: 120 }} inputProps={{ 'aria-label': `Tier label ${idx + 1}` }} />
                        <TextField label="Amount" value={tier.amount} onChange={e => { const val = e.target.value; if (/^\d*(\.\d{0,2})?$/.test(val) || val === '') { handleTierChange(idx, 'amount', val); } }} disabled={disabled} error={!!errors[`priceTiers.${idx}.amount`]} helperText={errors[`priceTiers.${idx}.amount`]} type="text" InputProps={{ startAdornment: <span>{currency}</span>, inputMode: 'decimal' }} sx={{ minWidth: 100 }} inputProps={{ 'aria-label': `Tier amount ${idx + 1}`, pattern: '\\d+(\\.\\d{1,2})?' }} />
                        <Tooltip title="Remove Tier">
                          <span>
                            <IconButton aria-label="Remove tier" onClick={() => handleRemoveTier(idx)} disabled={disabled || value.priceTiers.length === 0}>
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
      <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddTier} disabled={disabled} sx={{ mt: 1 }}>Add Tier</Button>
      {errors['priceTiers'] && <FormHelperText error>{errors['priceTiers']}</FormHelperText>}
      {errors.global && <FormHelperText error sx={{ mt: 1, textAlign: 'center' }}>{errors.global}</FormHelperText>}

      <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" onClick={handleSaveTiers} disabled={!canSaveTiers || isSavingTiers || !conventionId}>
          {isSavingTiers ? 'Saving Tiers...' : 'Save Pricing Tiers'}
        </Button>
      </Box>

      {tiersSaved && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" gutterBottom>Price Discounts</Typography>

          {discountDatePickers.map((discountGroup, groupIdx) => (
            <Card key={discountGroup.tempId} sx={{ mb: 2, opacity: disabled ? 0.7 : 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: discountGroup.date ? 2 : 0 }}>
                  <DatePicker
                    label="Discount Cutoff Date"
                    value={discountGroup.date}
                    onChange={date => handleDiscountDateChange(groupIdx, date)}
                    disabled={disabled}
                    slotProps={{ textField: { error: false, helperText: null } }}
                  />
                  <Tooltip title="Remove Discount Date Group">
                    <IconButton aria-label="Remove discount date group" onClick={() => handleRemoveDiscountDateGroup(groupIdx)} disabled={disabled}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {discountGroup.date && (
                  <Box sx={{ mt: 2 }}>
                    {discountGroup.tierDiscounts.map((tierDiscount, tdIdx) => (
                      <Box key={tierDiscount.priceTierId} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography sx={{ minWidth: 120, flexShrink: 0 }}>
                          {tierDiscount.label} ({currency}{value.priceTiers.find(t => t.id === tierDiscount.priceTierId)?.amount || 0})
                        </Typography>
                        <TextField
                          label="Discounted Amount"
                          value={tierDiscount.amount}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^\d*(\.\d{0,2})?$/.test(val) || val === '') {
                              handleDiscountAmountChange(groupIdx, tdIdx, val);
                            }
                          }}
                          disabled={disabled || !value.priceTiers.find(t => t.id === tierDiscount.priceTierId)}
                          type="text"
                          InputProps={{ startAdornment: <span>{currency}</span>, inputMode: 'decimal' }}
                          sx={{ minWidth: 100 }}
                          inputProps={{ 'aria-label': `Discounted amount for ${tierDiscount.label}` }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddDiscountDateGroup}
            disabled={disabled || !value.priceTiers.every(t => t.id)}
            sx={{ mt: 1 }}
          >
            Add Discount Date
          </Button>

          {(discountDatePickers.length > 0 || value.priceDiscounts.length > 0) && (
            <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="secondary" onClick={handleSaveDiscounts} disabled={isSavingDiscounts || !canSaveDiscounts || !conventionId}>
                {isSavingDiscounts ? 'Saving Discounts...' : 'Save Price Discounts'}
              </Button>
            </Box>
          )}
          {discountDatePickers.length === 0 && value.priceTiers.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              No discount dates added yet. Click "Add Discount Date" to create one.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}; 