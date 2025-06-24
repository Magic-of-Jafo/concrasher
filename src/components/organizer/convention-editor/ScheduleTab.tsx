import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Box, Button, CircularProgress, Typography, Tooltip, Alert, Paper, IconButton, Divider, TextField } from '@mui/material';
import { Theme, useTheme, alpha } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import {
  getScheduleItemsByConvention,
  initializeScheduleDays,
  bulkCreateScheduleItems,
  deleteScheduleDay as deleteScheduleDayAction,
  createScheduleItem,
  updateScheduleItem
} from '@/lib/actions';
import ScheduleEventForm from './ScheduleEventForm';
import ScheduleTimelineGrid from './ScheduleTimelineGrid';
import { format, addDays } from 'date-fns';

const EVENT_TYPES = [
  { value: 'Lecture', color: '#64b5f6' },
  { value: 'Workshop', color: '#81c784' },
  { value: 'Show', color: '#ba68c8' },
  { value: 'Panel', color: '#ffb74d' },
  { value: 'Competition', color: '#f06292' },
  { value: 'Dealers', color: '#4db6ac' },
  { value: 'Other', color: '#90a4ae' },
];
const DEFAULT_EVENT_COLOR = '#bdbdbd';

interface ScheduleTabProps {
  conventionId: string;
  startDate: Date | null;
  isOneDayEvent: boolean;
  conventionName?: string;
  conventionEndDate?: Date | null;
}

const PREVIEW_WIDTH_PERCENT = 50;
const TIMELINE_GRID_WIDTH_PX = 400;
const PREVIEW_PANE_WIDTH_PX = TIMELINE_GRID_WIDTH_PX * (PREVIEW_WIDTH_PERCENT / 100);

export default function ScheduleTab({ conventionId, startDate, isOneDayEvent, conventionName, conventionEndDate }: ScheduleTabProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [venues, setVenues] = useState<{ id: string; venueName: string; isPrimaryVenue?: boolean }[]>([]);
  const [hotels, setHotels] = useState<{ id: string; hotelName: string }[]>([]);
  const [initLoading, setInitLoading] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<any[]>([]);
  const [daysLoading, setDaysLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [addDayError, setAddDayError] = useState<string | null>(null);
  const addDayErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);

  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListScrollRef = useRef<HTMLDivElement>(null);

  const [isDeletingDay, setIsDeletingDay] = useState(false);

  const eventsToConsiderForSave = useMemo(() => {
    return scheduleItems.filter(item =>
      item.id &&
      (
        (typeof item.startTimeMinutes === 'number' && typeof item.dayOffset === 'number') ||
        (item.startTimeMinutes === null && item.dayOffset === null && item.durationMinutes === null)
      )
    );
  }, [scheduleItems]);

  const hasPlacedEventsWithMissingTitles = useMemo(() => {
    return eventsToConsiderForSave.some(
      item => (typeof item.startTimeMinutes === 'number' && typeof item.dayOffset === 'number') && !item.title
    );
  }, [eventsToConsiderForSave]);

  const hasSaveablePlacedEvents = useMemo(() => {
    return eventsToConsiderForSave.length > 0;
  }, [eventsToConsiderForSave]);

  const minDayOffset = useMemo(() => {
    if (scheduleDays.length === 0) return null;
    return Math.min(...scheduleDays.map(d => d.dayOffset));
  }, [scheduleDays]);

  const maxDayOffset = useMemo(() => {
    if (scheduleDays.length === 0) return null;
    return Math.max(...scheduleDays.map(d => d.dayOffset));
  }, [scheduleDays]);

  const handleInitializeScheduleDays = async () => {
    setInitLoading(true);
    setError(null);
    setSaveError(null);
    setSaveSuccessMessage(null);
    try {
      const result = await initializeScheduleDays(conventionId);
      if (!result.success) {
        setError(result.error || 'Failed to initialize timelines.');
        setInitLoading(false);
        return;
      }
      window.location.reload();
    } catch (e) {
      setError('Failed to initialize timelines.');
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    getScheduleItemsByConvention(conventionId)
      .then(res => {
        if (res.success) {
          setScheduleItems(res.items ?? []);
        } else {
          setError(res.error || 'Failed to load schedule.');
        }
      })
      .finally(() => setLoading(false));
  }, [conventionId]);

  useEffect(() => {
    if (!conventionId) return;
    fetch(`/api/conventions/${conventionId}/venues`)
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setVenues(data) : setVenues([]))
      .catch(() => setVenues([]));
    fetch(`/api/conventions/${conventionId}/hotels`)
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setHotels(data) : setHotels([]))
      .catch(() => setHotels([]));
  }, [conventionId]);

  useEffect(() => {
    if (!conventionId) {
      setDaysLoading(false);
      setLoading(false);
      setScheduleDays([]);
      setCurrentDayOffset(0);
      return;
    }
    fetchScheduleDays();
  }, [conventionId]);

  const fetchScheduleDays = async () => {
    setDaysLoading(true);
    try {
      const res = await fetch(`/api/conventions/${conventionId}/schedule-days`);
      const data = await res.json();
      if (Array.isArray(data.days)) {
        const sortedDays = data.days.sort((a: any, b: any) => a.dayOffset - b.dayOffset);
        setScheduleDays(sortedDays);
        if (sortedDays.length > 0) {
          setCurrentDayOffset(sortedDays[0].dayOffset);
        } else {
          setCurrentDayOffset(0);
        }
      } else {
        setScheduleDays([]);
        setCurrentDayOffset(0);
        setError('Failed to load schedule day structure.');
      }
    } catch (err) {
      setScheduleDays([]);
      setCurrentDayOffset(0);
      setError('Error fetching schedule day structure.');
    } finally {
      setDaysLoading(false);
    }
  };

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (addDayErrorTimeoutRef.current) {
        clearTimeout(addDayErrorTimeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleTimelineEventSelect = (eventId: string) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    console.log('[ScheduleTab] handleTimelineEventSelect called with ID:', eventId);
    setHighlightedEventId(eventId);
    highlightTimeoutRef.current = setTimeout(() => {
      console.log('[ScheduleTab] Clearing highlight for ID:', eventId);
      setHighlightedEventId(null);
    }, 3000); // Highlight for 3 seconds
  };

  useEffect(() => {
    console.log('[ScheduleTab] useEffect for highlight triggered. highlightedEventId:', highlightedEventId);
    if (highlightedEventId && eventListScrollRef.current) {
      const element = eventListScrollRef.current.querySelector(`[data-event-id="${highlightedEventId}"]`);
      console.log('[ScheduleTab] Found element for highlight:', element);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedEventId]);

  const handleAddDay = async (beforeOrAfter: 'before' | 'after') => {
    setIsAddingDay(true);
    if (addDayErrorTimeoutRef.current) clearTimeout(addDayErrorTimeoutRef.current);
    setAddDayError(null);
    setSaveSuccessMessage(null);
    setError(null);

    let newDayOffset;
    if (beforeOrAfter === 'before') {
      if (minDayOffset === null) {
        setAddDayError("Cannot determine current day range.");
        setIsAddingDay(false);
        if (addDayErrorTimeoutRef.current) clearTimeout(addDayErrorTimeoutRef.current);
        addDayErrorTimeoutRef.current = setTimeout(() => setAddDayError(null), 3000);
        return;
      }
      newDayOffset = minDayOffset - 1;
    } else {
      if (maxDayOffset === null) {
        setAddDayError("Cannot determine current day range.");
        setIsAddingDay(false);
        if (addDayErrorTimeoutRef.current) clearTimeout(addDayErrorTimeoutRef.current);
        addDayErrorTimeoutRef.current = setTimeout(() => setAddDayError(null), 3000);
        return;
      }
      newDayOffset = maxDayOffset + 1;
    }

    try {
      const res = await fetch(`/api/conventions/${conventionId}/schedule-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOffset: newDayOffset }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setAddDayError(result.error || `Failed to add day ${beforeOrAfter} current range.`);
        if (addDayErrorTimeoutRef.current) clearTimeout(addDayErrorTimeoutRef.current);
        addDayErrorTimeoutRef.current = setTimeout(() => setAddDayError(null), 3000);
      } else {
        await fetchScheduleDays();
        setCurrentDayOffset(newDayOffset);
        setSaveSuccessMessage(`Day successfully added ${beforeOrAfter} current range.`)
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setAddDayError(err.message || `An unexpected error occurred while adding day ${beforeOrAfter} current range.`);
      if (addDayErrorTimeoutRef.current) clearTimeout(addDayErrorTimeoutRef.current);
      addDayErrorTimeoutRef.current = setTimeout(() => setAddDayError(null), 3000);
    } finally {
      setIsAddingDay(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleSaveEvent = async (data: any) => {
    setSaveError(null);
    setSaveSuccessMessage(null);
    setIsSaving(true);
    try {
      let result;
      const isUpdating = !!data.id;

      if (isUpdating) {
        result = await updateScheduleItem({
          conventionId,
          data: data,
        });
      } else {
        // For creation, find the schedule day ID if a dayOffset is provided.
        // If dayOffset is null/undefined (for an unscheduled event), scheduleDayId will be null.
        const scheduleDayId = scheduleDays.find(d => d.dayOffset === data.dayOffset)?.id ?? null;

        result = await createScheduleItem({
          conventionId,
          scheduleDayId: scheduleDayId,
          data: data,
        });
      }

      if (result.success) {
        setSaveSuccessMessage('Event saved successfully!');
        setTimeout(() => setSaveSuccessMessage(null), 3000);

        const updatedItem = result.item;

        if (isUpdating) {
          setScheduleItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        } else {
          setScheduleItems(prev => [...prev, updatedItem]);
        }

        handleCloseForm();
      } else {
        setSaveError(result.error || 'An unknown error occurred.');
      }
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
      setFormOpen(false);
      setEditingItem(null);
    }
  };

  const handleEditEvent = (item: any) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDeleteEvent = async (item: any) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setLoading(true);
    setError(null);
    setSaveError(null);
    setSaveSuccessMessage(null);
    try {
      const res = await fetch(`/api/conventions/${conventionId}/schedule-items/${item.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || 'Failed to delete event');
        return;
      }
      getScheduleItemsByConvention(conventionId)
        .then(res => {
          if (res.success) {
            setScheduleItems(res.items ?? []);
          } else {
            setError(res.error || 'Failed to reload schedule after delete.');
          }
        })
        .finally(() => setLoading(false));
      setSaveSuccessMessage('Event deleted successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
      setLoading(false);
    }
    setLoading(false);
  };

  // New callback for the form's delete button
  const handleDeleteFromForm = () => {
    if (editingItem) {
      handleDeleteEvent(editingItem);
      setFormOpen(false); // Close the form after initiating delete
    }
  };

  const handleAssignExistingEventToSlot = (
    eventId: string,
    dayOffset: number,
    startTimeMinutes: number,
    durationMinutes: number,
    title?: string
  ) => {
    setScheduleItems(prevItems =>
      prevItems.map(item => {
        if (item.id === eventId || item.tempId === eventId) {
          const updatedItem = {
            ...item,
            dayOffset: dayOffset,
            startTimeMinutes: startTimeMinutes,
            durationMinutes: durationMinutes,
          };
          if (title !== undefined) {
            updatedItem.title = title;
          }
          return updatedItem;
        }
        return item;
      })
    );
    setSaveError(null);
    setSaveSuccessMessage(null);
  };

  const handleUnscheduleEvent = (eventId: string) => {
    setScheduleItems(prevItems =>
      prevItems.map(item => {
        if (item.id === eventId) {
          const updatedItem = { ...item };
          updatedItem.dayOffset = null;
          updatedItem.startTimeMinutes = null;
          updatedItem.durationMinutes = null;
          return updatedItem;
        }
        return item;
      })
    );
    setSaveSuccessMessage(`Event removed from timeline. Save placements to confirm.`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleSavePlacedEvents = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMessage(null);
    const itemsToUpdate = eventsToConsiderForSave;
    if (hasPlacedEventsWithMissingTitles) {
      setSaveError('Title is required for all placed events.');
      setSaveSuccessMessage('Cannot save: Some placed events are missing a title.');
      setIsSaving(false);
      setTimeout(() => {
        setSaveError(null);
        setSaveSuccessMessage(null);
      }, 5000);
      return;
    }
    if (itemsToUpdate.length === 0) {
      setSaveSuccessMessage('No timeline changes to save.');
      setIsSaving(false);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 3000);
      return;
    }
    const updatePromises = itemsToUpdate.map(item => {
      // Find the corresponding ScheduleDay record to get its ID
      const targetScheduleDay = scheduleDays.find(sd => sd.dayOffset === item.dayOffset);

      const payload: any = {
        title: item.title,
        dayOffset: item.dayOffset,
        startTimeMinutes: item.startTimeMinutes,
        durationMinutes: item.durationMinutes,
      };

      if (targetScheduleDay) {
        payload.scheduleDayId = targetScheduleDay.id;
      } else if (typeof item.dayOffset === 'number' && item.startTimeMinutes !== null) {
        // If item is placed (has dayOffset and startTime) but no matching ScheduleDay found,
        // this is an inconsistency. For now, we'll log and not send scheduleDayId.
        // Ideally, this situation shouldn't occur if scheduleDays state is always in sync.
        console.warn(`Could not find ScheduleDay for dayOffset: ${item.dayOffset} for item ID: ${item.id}. scheduleDayId will not be updated.`);
      } else {
        // If the item is being unscheduled (dayOffset is null), ensure scheduleDayId is also nulled out.
        // This case is handled if item.dayOffset is null, then targetScheduleDay will be undefined.
        // To be explicit if scheduleDayId needs to be cleared when item is unscheduled:
        if (item.dayOffset === null && item.startTimeMinutes === null && item.durationMinutes === null) {
          payload.scheduleDayId = null;
        }
      }

      console.log("[ScheduleTab] handleSavePlacedEvents - Payload for item:", item.id, JSON.stringify(payload, null, 2)); // Log the payload

      return fetch(`/api/conventions/${conventionId}/schedule-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async res => {
        const result = await res.json();
        if (!res.ok || !result.success) {
          return Promise.reject(result.error || `Failed for event: ${item.title || item.id}`);
        }
        return result;
      });
    });
    try {
      const results = await Promise.allSettled(updatePromises);
      const failedUpdates = results.filter(result => result.status === 'rejected');
      if (failedUpdates.length > 0) {
        const errorMessages = failedUpdates
          .map(f => (f as PromiseRejectedResult).reason)
          .join('; \n');
        setSaveError(`Some placements failed to save: ${errorMessages}`);
        setSaveSuccessMessage(null);
      } else {
        setSaveSuccessMessage('All timeline placements saved successfully!');
        setSaveError(null);
      }
    } catch (error) {
      setSaveError('An unexpected error occurred during the save process.');
      setSaveSuccessMessage(null);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveError(null);
        setSaveSuccessMessage(null);
      }, 7000);
    }
  };

  const handleBulkUpload = async () => {
    setBulkUploadLoading(true);
    setJsonError(null);
    setSaveError(null);
    setSaveSuccessMessage(null);
    setError(null);

    let parsedItems;
    try {
      // Attempt to parse the JSON input
      // The input might be a single object or an array of objects.
      // We'll normalize it to an array.
      const rawParsed = JSON.parse(jsonInput);
      if (Array.isArray(rawParsed)) {
        parsedItems = rawParsed;
      } else if (typeof rawParsed === 'object' && rawParsed !== null) {
        parsedItems = [rawParsed];
      } else {
        throw new Error("Input must be a JSON object or an array of JSON objects.");
      }

      if (parsedItems.length === 0) {
        setJsonError("No items to upload. Please provide at least one event object.");
        setBulkUploadLoading(false);
        return;
      }

    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`);
      setBulkUploadLoading(false);
      return;
    }

    try {
      const result = await bulkCreateScheduleItems(conventionId, parsedItems);
      if (result.success) {
        setSaveSuccessMessage(result.message || 'Bulk upload successful! Refreshing schedule...');
        setJsonInput(''); // Clear input on success
        // Refresh schedule items and days
        fetchScheduleDays();
        getScheduleItemsByConvention(conventionId)
          .then(res => {
            if (res.success) {
              setScheduleItems(res.items ?? []);
            } else {
              setError(res.error || 'Failed to reload schedule after bulk upload.');
            }
          })
          .finally(() => setLoading(false));

      } else {
        setSaveError(result.error || 'Bulk upload failed.');
        if (result.errors && result.errors.length > 0) {
          const errorDetails = result.errors.map((err: any, index: number) => `Item ${err.itemIndex !== undefined ? err.itemIndex + 1 : index + 1}: ${err.message}`).join('\n');
          setJsonError(`Validation errors:\n${errorDetails}`);
        }
      }
    } catch (e: any) {
      setSaveError(`An unexpected error occurred during bulk upload: ${e.message}`);
    } finally {
      setBulkUploadLoading(false);
      setTimeout(() => {
        setSaveSuccessMessage(null);
        setSaveError(null);
        // Keep jsonError if there were specific validation issues from backend
      }, 5000);
    }
  };

  // Sort schedule items for the left column
  const sortedScheduleItemsForList = useMemo(() => {
    return [...scheduleItems].sort((a, b) => {
      const aIsPlaced = typeof a.startTimeMinutes === 'number' && typeof a.dayOffset === 'number';
      const bIsPlaced = typeof b.startTimeMinutes === 'number' && typeof b.dayOffset === 'number';

      if (aIsPlaced !== bIsPlaced) {
        return aIsPlaced ? 1 : -1; // Unplaced (false) items first
      }
      // Secondary sort: by title alphabetically
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [scheduleItems]);

  // Find index for divider
  const firstPlacedItemIndex = useMemo(() => {
    return sortedScheduleItemsForList.findIndex(
      item => typeof item.startTimeMinutes === 'number' && typeof item.dayOffset === 'number'
    );
  }, [sortedScheduleItemsForList]);

  const currentDayData = useMemo(() => scheduleDays.find(d => d.dayOffset === currentDayOffset), [scheduleDays, currentDayOffset]);
  const previousDayData = useMemo(() => scheduleDays.find(d => d.dayOffset === currentDayOffset - 1), [scheduleDays, currentDayOffset]);
  const nextDayData = useMemo(() => scheduleDays.find(d => d.dayOffset === currentDayOffset + 1), [scheduleDays, currentDayOffset]);

  const handleDeleteDay = async (scheduleDayId: string, dayLabel: string) => {
    if (!window.confirm(`Are you sure you want to delete timeline for ${dayLabel}? All events currently on this day will be unscheduled and will need to be reassigned.`)) {
      return;
    }
    setIsDeletingDay(true);
    setSaveError(null);
    setSaveSuccessMessage(null);
    setError(null);

    try {
      // We'll call the server action directly instead of an API route for now
      // This keeps backend logic consolidated in actions.ts
      const result = await deleteScheduleDayAction(conventionId, scheduleDayId);

      if (result.success) {
        setSaveSuccessMessage(result.message || 'Day deleted successfully.');
        await fetchScheduleDays(); // This will also reset currentDayOffset if the deleted day was current
        getScheduleItemsByConvention(conventionId) // Refresh items as they might have been unscheduled
          .then(resGet => {
            if (resGet.success) setScheduleItems(resGet.items ?? []);
            else setError(resGet.error || 'Failed to reload schedule items after day deletion.');
          });
      } else {
        setSaveError(result.error || 'Failed to delete day.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'An unexpected error occurred while deleting the day.');
    } finally {
      setIsDeletingDay(false);
      setTimeout(() => {
        setSaveError(null);
        setSaveSuccessMessage(null);
      }, 7000);
    }
  };

  const handleNavigateDay = (direction: 'prev' | 'next') => {
    setCurrentDayOffset(prevOffset => {
      const newOffset = direction === 'prev' ? prevOffset - 1 : prevOffset + 1;
      if (scheduleDays.some(d => d.dayOffset === newOffset)) {
        return newOffset;
      }
      return prevOffset;
    });
  };

  if (!conventionId) {
    return <Typography sx={{ p: 2 }}>Please select a convention to manage its schedule.</Typography>;
  }

  if (daysLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', p: 2 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading schedule configuration...</Typography>
      </Box>
    );
  }

  if (scheduleDays.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Convention Timeline Not Initialized
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No timelines found for this convention.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click the button below to create the daily timeline structures based on your convention's start date and duration.
        </Typography>
        <Tooltip title={!startDate ? "Convention start date is not set. Please set it in the 'Details' tab first." : ""}>
          <span>
            <Button
              variant="contained"
              color="primary"
              onClick={handleInitializeScheduleDays}
              disabled={initLoading || !startDate}
              sx={{ minWidth: 180 }}
            >
              {initLoading ? <CircularProgress size={24} /> : 'Initialize Timelines'}
            </Button>
          </span>
        </Tooltip>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Box>
    );
  }

  const unscheduledEvents = scheduleItems.filter(item => !item.startTimeMinutes && typeof item.dayOffset !== 'number');

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {/* Left Column: All Events List */}
        <Box sx={{
          width: '33%',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 160px)',
          border: '1px solid #ddd',
          borderRadius: 1
        }}>
          {/* Fixed Header for Left Column */}
          <Box sx={{
            backgroundColor: 'background.paper',
            zIndex: 1,
            p: 1,
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <Typography variant="h6" sx={{ mb: 0 }}>
              All Events ({scheduleItems.length})
            </Typography>
            <Button variant="contained" color="primary" onClick={handleCreate} size="small">
              Add New Event
            </Button>
          </Box>

          {/* Scrollable List Container for Left Column */}
          <Box sx={{
            flexGrow: 1,
            overflowY: 'auto',
            paddingTop: theme => theme.spacing(1),
          }}
            ref={eventListScrollRef}
          >
            {loading && scheduleItems.length === 0 && <CircularProgress sx={{ alignSelf: 'center', mt: 2 }} />}
            {!loading && scheduleItems.length === 0 && (
              <Typography sx={{ mt: 2, textAlign: 'center' }}>No events created yet. Click "Add New Event" to start.</Typography>
            )}
            {sortedScheduleItemsForList.map((item, index) => {
              const eventTypeDetails = EVENT_TYPES.find(et => et.value === item.eventType);
              const baseColor = eventTypeDetails?.color || DEFAULT_EVENT_COLOR;
              const isPlaced = typeof item.startTimeMinutes === 'number' && typeof item.dayOffset === 'number';
              const finalColor = baseColor;
              const paperBorder = '1px solid #eee';
              const showDivider = firstPlacedItemIndex > 0 && index === firstPlacedItemIndex;

              return (
                <React.Fragment key={item.id || item.tempId}>
                  {showDivider && <Divider sx={{ my: 1.5, borderColor: 'primary.main', borderWidth: '1px' }} />}
                  <Paper
                    data-event-id={item.id || item.tempId}
                    draggable={true}
                    onDragStart={(e) => {
                      const dragData = JSON.stringify({
                        id: item.id || item.tempId,
                        durationMinutes: item.durationMinutes || 30,
                        title: item.title || '(Untitled Event)',
                        isNewlyCreated: !item.id
                      });
                      e.dataTransfer.setData("application/json", dragData);
                      e.dataTransfer.effectAllowed = "move";
                      const img = new Image();
                      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                      e.dataTransfer.setDragImage(img, 0, 0);
                    }}
                    elevation={2}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      backgroundColor: finalColor,
                      color: '#fff',
                      border: paperBorder,
                      boxShadow: highlightedEventId === (item.id || item.tempId)
                        ? `inset 0 0 10px 4px ${alpha(theme.palette.common.white, 0.85)}`
                        : undefined,
                      outline: undefined,
                      position: 'relative',
                      transition: 'box-shadow 0.3s ease-in-out, outline 0.3s ease-in-out',
                      '&:hover': {
                        backgroundColor: alpha(finalColor, 0.9),
                        boxShadow: highlightedEventId === (item.id || item.tempId)
                          ? `inset 0 0 10px 4px ${alpha(theme.palette.common.white, 0.85)}`
                          : theme.shadows[3],
                        outline: undefined,
                      }
                    }}
                    onClick={() => handleEditEvent(item)}
                  >
                    {isPlaced && (
                      <StarIcon
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          left: 'auto',
                          fontSize: '1rem',
                          color: 'gold'
                        }}
                      />
                    )}
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, pr: isPlaced ? 2.5 : 0 }}>
                      {item.title || '(Untitled Event)'}
                    </Typography>
                  </Paper>
                </React.Fragment>
              );
            })}
          </Box>
        </Box>

        {/* Right Column: Horizontal Day Navigation & Timelines */}
        <Box sx={{ width: '67%', display: 'flex', flexDirection: 'column' }}>
          {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}
          {saveError && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{saveError}</Alert>}
          {saveSuccessMessage && <Alert severity="success" sx={{ mb: 2, flexShrink: 0 }}>{saveSuccessMessage}</Alert>}
          {addDayError && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{addDayError}</Alert>}

          {/* Horizontal Day Display Area - This container should clip its children */}
          <Box sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Navigation Icons - positioned absolutely relative to this Box */}
            {scheduleDays.length > 1 && previousDayData && (
              <IconButton onClick={() => handleNavigateDay('prev')} sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 2, backgroundColor: 'rgba(255,255,255,0.7)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' } }}>
                <ChevronLeftIcon />
              </IconButton>
            )}
            {scheduleDays.length > 1 && nextDayData && (
              <IconButton onClick={() => handleNavigateDay('next')} sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 2, backgroundColor: 'rgba(255,255,255,0.7)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' } }}>
                <ChevronRightIcon />
              </IconButton>
            )}

            {/* Inner container for the three panes (previous, current, next) */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', height: '100%', gap: (theme: Theme) => theme.spacing(2) }}>
              {/* Previous Day Preview Pane or Placeholder with Add Button */}
              {previousDayData ? (
                <Box
                  onClick={() => { if (previousDayData && typeof previousDayData.dayOffset === 'number') { setTimeout(() => setCurrentDayOffset(previousDayData.dayOffset), 0); } }}
                  sx={{ width: `${PREVIEW_PANE_WIDTH_PX}px`, height: '100%', overflow: 'hidden', position: 'relative', cursor: 'pointer', backgroundColor: 'background.default' }}
                >
                  <Box sx={{ position: 'absolute', right: 0, width: `${TIMELINE_GRID_WIDTH_PX}px`, height: '100%', pointerEvents: 'none' }}>
                    <Typography variant="h6" sx={{ textAlign: 'right', py: 1, pr: 1 }}>{startDate ? format(addDays(startDate, previousDayData.dayOffset), 'EEEE') : `Day ${previousDayData.dayOffset + 1}`}</Typography>
                    <ScheduleTimelineGrid dayOffset={previousDayData.dayOffset} allScheduleItems={scheduleItems.filter(item => item.dayOffset === previousDayData.dayOffset && typeof item.startTimeMinutes === 'number')} />
                  </Box>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: (theme: Theme) => `linear-gradient(to right, ${theme.palette.background.default} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none' }} />
                </Box>
              ) : (
                (!isOneDayEvent && scheduleDays.length > 0 && currentDayOffset === minDayOffset && minDayOffset !== null) ? (
                  <Box sx={{ width: `${PREVIEW_PANE_WIDTH_PX}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: `1px dashed ${theme.palette.grey[300]}`, borderRadius: 1, backgroundColor: alpha(theme.palette.grey[100], 0.5) }}>
                    <Tooltip title="Add Day Before">
                      <span>
                        <IconButton onClick={() => handleAddDay('before')} disabled={isAddingDay} size="large" color="primary">
                          {isAddingDay ? <CircularProgress size={28} /> : <AddCircleOutlineIcon sx={{ fontSize: '2rem' }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box sx={{ width: `${PREVIEW_PANE_WIDTH_PX}px`, flexShrink: 0 }} />
                )
              )}

              {/* Current Day Timeline */}
              {currentDayData ? (
                <Box sx={{ width: `${TIMELINE_GRID_WIDTH_PX}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, backgroundColor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.5, position: 'relative', width: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 0 /* Override gutterBottom */ }}>
                      {startDate ? format(addDays(startDate, currentDayData.dayOffset), 'EEEE, MMMM d') : `Day ${currentDayData.dayOffset + 1}`}
                    </Typography>
                    {currentDayData.isOfficial === false && (
                      <Tooltip title="Delete this day's timeline">
                        <span>
                          <IconButton
                            onClick={() => handleDeleteDay(currentDayData.id, startDate ? format(addDays(startDate, currentDayData.dayOffset), 'EEEE, MMMM d') : `Day ${currentDayData.dayOffset + 1}`)}
                            disabled={isDeletingDay}
                            size="small"
                            sx={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'error.main',
                              '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) }
                            }}
                          >
                            {isDeletingDay && currentDayData.id === (scheduleDays.find(d => d.dayOffset === currentDayOffset)?.id) ? <CircularProgress size={20} color="inherit" /> : <DeleteForeverIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                  <ScheduleTimelineGrid
                    dayOffset={currentDayData.dayOffset}
                    allScheduleItems={scheduleItems.filter(item => item.dayOffset === currentDayData.dayOffset && typeof item.startTimeMinutes === 'number')}
                    onAssignExistingEvent={handleAssignExistingEventToSlot}
                    onUnscheduleEvent={handleUnscheduleEvent}
                    onEventSelect={handleTimelineEventSelect}
                  />
                </Box>
              ) : scheduleDays.length > 0 ? (
                <Typography sx={{ textAlign: 'center', py: 20, width: `${TIMELINE_GRID_WIDTH_PX}px` }}>Day data not found. Select a day.</Typography>
              ) : (
                <Typography sx={{ textAlign: 'center', py: 20, width: `${TIMELINE_GRID_WIDTH_PX}px` }}>Loading or no schedule days...</Typography>
              )}

              {/* Next Day Preview Pane or Placeholder with Add Button */}
              {nextDayData ? (
                <Box
                  onClick={() => { if (nextDayData && typeof nextDayData.dayOffset === 'number') { setTimeout(() => setCurrentDayOffset(nextDayData.dayOffset), 0); } }}
                  sx={{ width: `${PREVIEW_PANE_WIDTH_PX}px`, height: '100%', overflow: 'hidden', position: 'relative', cursor: 'pointer', backgroundColor: 'background.default' }}
                >
                  <Box sx={{ position: 'absolute', left: 0, width: `${TIMELINE_GRID_WIDTH_PX}px`, height: '100%', pointerEvents: 'none' }}>
                    <Typography variant="h6" sx={{ textAlign: 'left', py: 1, pl: 1 }}>{startDate ? format(addDays(startDate, nextDayData.dayOffset), 'EEEE') : `Day ${nextDayData.dayOffset + 1}`}</Typography>
                    <ScheduleTimelineGrid dayOffset={nextDayData.dayOffset} allScheduleItems={scheduleItems.filter(item => item.dayOffset === nextDayData.dayOffset && typeof item.startTimeMinutes === 'number')} />
                  </Box>
                  <Box sx={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: (theme: Theme) => `linear-gradient(to left, ${theme.palette.background.default} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none' }} />
                </Box>
              ) : (
                (!isOneDayEvent && scheduleDays.length > 0 && currentDayOffset === maxDayOffset && maxDayOffset !== null) ? (
                  <Box sx={{ width: `${PREVIEW_PANE_WIDTH_PX}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: `1px dashed ${theme.palette.grey[300]}`, borderRadius: 1, backgroundColor: alpha(theme.palette.grey[100], 0.5) }}>
                    <Tooltip title="Add Day After">
                      <span>
                        <IconButton onClick={() => handleAddDay('after')} disabled={isAddingDay} size="large" color="primary">
                          {isAddingDay ? <CircularProgress size={28} /> : <AddCircleOutlineIcon sx={{ fontSize: '2rem' }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box sx={{ width: `${PREVIEW_PANE_WIDTH_PX}px`, flexShrink: 0 }} />
                )
              )}
            </Box>
          </Box>

          {/* Save Button Area - Stays at the bottom */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid #ddd', flexShrink: 0 }}>
            <Button variant="outlined" color="secondary" onClick={handleSavePlacedEvents} disabled={isSaving || hasPlacedEventsWithMissingTitles || !hasSaveablePlacedEvents}>
              {isSaving ? <CircularProgress size={24} /> : 'Save Timeline'}
            </Button>
          </Box>

          {formOpen && (
            <ScheduleEventForm
              open={formOpen}
              onClose={() => setFormOpen(false)}
              item={editingItem}
              conventionId={conventionId}
              venues={venues}
              hotels={hotels}
              allScheduleItems={scheduleItems}
              onSave={handleSaveEvent}
              onDelete={handleDeleteFromForm}
              forceCreateNew={!editingItem}
            />
          )}
        </Box>
      </Box>

      {/* Bulk JSON Upload Section - Moved here */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>Need Help Formatting Your Schedule?</Typography>
        <Typography variant="body1" gutterBottom>
          Skip the manual typing. Click the link below to open the <strong>Convention Crasher Event Automator</strong>.
        </Typography>
        <Typography variant="body1" gutterBottom>
          This assistant will turn your full event schedule into a clean, ready-to-paste JSON file—one day at a time.
        </Typography>
        <Typography variant="body1" component="div" gutterBottom sx={{ fontWeight: 'bold' }}>
          Here's how to use it:
        </Typography>
        <Box component="ol" sx={{ pl: 2, mb: 2 }}>
          <Typography component="li" variant="body1">Click the link below. It will open the assistant with your convention dates already filled in.</Typography>
          <Typography component="li" variant="body1">Press <code>Enter</code> when the page loads to send the first message.</Typography>
          <Typography component="li" variant="body1">When prompted, upload or paste your schedule. You can share:</Typography>
          <Box component="ul" sx={{ pl: 2, listStyleType: 'disc' }}>
            <Typography component="li" variant="body1">A link to your schedule webpage</Typography>
            <Typography component="li" variant="body1">A PDF</Typography>
            <Typography component="li" variant="body1">An Excel or Google Sheets file</Typography>
            <Typography component="li" variant="body1">Or even a copy/pasted table</Typography>
          </Box>
          <Typography component="li" variant="body1">The assistant will return one day's worth of events as a code block. <strong>Copy and paste the code block into the field below.</strong></Typography>
        </Box>

        {(() => {
          const assistantBaseUrl = "https://chatgpt.com/g/g-6831c0ee9010819186a19abf89a98e4c-convention-crasher-event-automator?prompt=";
          let promptText = "My Convention Schedule"; // Default if no dates/name

          if (!startDate) {
            return (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  color="info"
                  disabled={true}
                  startIcon={<LinkIcon />}
                  sx={{ fontWeight: 'bold' }}
                >
                  Click Here to Use the Schedule Assistant
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Convention start and end dates are required to use the Schedule Assistant. Please set them in the 'Details' tab.
                </Typography>
              </Box>
            );
          }

          const formattedStartDate = format(startDate, 'MMMM d, yyyy');
          let conventionDetails = conventionName || "My Convention";
          conventionDetails += ` - Start Date: ${formattedStartDate}`;
          if (conventionEndDate) {
            conventionDetails += ` - End Date: ${format(conventionEndDate, 'MMMM d, yyyy')}`;
          }
          promptText = conventionDetails;

          const fullUrl = `${assistantBaseUrl}${encodeURIComponent(promptText)}`;

          return (
            <Button
              variant="contained"
              color="info"
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LinkIcon />}
              sx={{ mb: 2, fontWeight: 'bold' }}
            >
              Click Here to Use the Schedule Assistant
            </Button>
          );
        })()}

        <TextField
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            if (jsonError) setJsonError(null); // Clear previous JSON parse error on new input
          }}
          error={!!jsonError}
          helperText={jsonError}
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<UploadFileIcon />}
            onClick={handleBulkUpload}
            disabled={bulkUploadLoading || !jsonInput.trim()}
          >
            {bulkUploadLoading ? <CircularProgress size={24} color="inherit" /> : 'Upload JSON'}
          </Button>
          <Button
            variant="outlined"
            color="inherit" // Using inherit to make it less prominent than the upload button
            onClick={() => {
              setJsonInput('');
              setJsonError(null);
            }}
            disabled={bulkUploadLoading || !jsonInput.trim()} // Also disable if no input or loading
          >
            Clear
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}