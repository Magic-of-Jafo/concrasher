import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Typography, Tooltip, Button, Paper, IconButton } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import FlagIcon from '@mui/icons-material/Flag';
import { useTheme, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const EVENT_TYPES = [
  { value: 'Lecture', color: '#64b5f6' },     // Blue 300
  { value: 'Workshop', color: '#81c784' },    // Green 300
  { value: 'Show', color: '#ba68c8' },        // Purple 300
  { value: 'Panel', color: '#ffb74d' },       // Orange 300
  { value: 'Competition', color: '#f06292' },  // Pink 300
  { value: 'Dealers', color: '#4db6ac' },     // Teal 300
  { value: 'Other', color: '#90a4ae' },       // Blue Grey 300
  { value: 'Milestone', color: '#ffd54f' },   // Amber 300 - Added for Milestones if not using eventType's color
];
const DEFAULT_EVENT_COLOR = '#bdbdbd'; // Grey 400

const INTERVAL_MINUTES = 15;
const ROWS_PER_HOUR = 60 / INTERVAL_MINUTES;
const ROW_HEIGHT_PX = 30; // Height of each 15-min row
const VISIBLE_WINDOW_HOURS = 5;
const VISIBLE_WINDOW_ROWS = VISIBLE_WINDOW_HOURS * ROWS_PER_HOUR;
const TIME_LABEL_WIDTH_PX = 64;
const EVENT_HORIZONTAL_GAP_PX = 2; // Gap between side-by-side events
const RESIZE_HANDLE_AREA_PX = 8; // Height of the interactive resize edges (top/bottom)
const MIN_EVENT_DURATION_MINUTES = 15; // Minimum duration for an event
const MILESTONE_ICON_SIZE = '1.2rem'; // For FlagIcon

interface VirtualElement {
  getBoundingClientRect: () => DOMRect;
}

// Utility: Convert minutes since midnight to time string (e.g., "9AM", "10AM")
function formatTimeFromMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Utility: Snap minutes to nearest 15-minute increment (global time)
const snapToNearest15Minutes = (minutes: number): number => {
  return Math.round(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
};

// Helper type for layout calculation
interface EventItemLayout {
  col: number;    // 0-indexed column for this event
  numCols: number; // Total number of columns in its overlapping group
}

interface ProcessedEventData {
  eventItem: any; // Replace 'any' with your specific event type if available
  layout: EventItemLayout;
}

// Function to calculate layout for overlapping events
function calculateLayout(visibleEvents: any[]): ProcessedEventData[] {
  const processedEventData: ProcessedEventData[] = [];

  // Sort by start time, then duration (longer first), then ID for stable processing
  const sortedEvents = [...visibleEvents].sort((a, b) => {
    if (a.startTimeMinutes !== b.startTimeMinutes) {
      return a.startTimeMinutes - b.startTimeMinutes;
    }
    if (a.durationMinutes !== b.durationMinutes) {
      return b.durationMinutes - a.durationMinutes; 
    }
    return (a.id || a.tempId).localeCompare(b.id || b.tempId);
  });

  for (const currentEvent of sortedEvents) {
    const overlappingSiblings: any[] = [];
    for (const otherEvent of sortedEvents) {
      if (currentEvent.id === otherEvent.id) continue;

      const currentEventEnd = currentEvent.startTimeMinutes + currentEvent.durationMinutes;
      const otherEventEnd = otherEvent.startTimeMinutes + otherEvent.durationMinutes;
      
      const startsOverlap = Math.max(currentEvent.startTimeMinutes, otherEvent.startTimeMinutes);
      const endsOverlap = Math.min(currentEventEnd, otherEventEnd);

      if (startsOverlap < endsOverlap) { // They overlap
        overlappingSiblings.push(otherEvent);
      }
    }

    const concurrentEventsGroup = [currentEvent, ...overlappingSiblings];
    concurrentEventsGroup.sort((a, b) => (a.id || a.tempId).localeCompare(b.id || b.tempId));
    
    const numColsInGroup = concurrentEventsGroup.length;
    const colIndex = concurrentEventsGroup.findIndex(e => (e.id || e.tempId) === (currentEvent.id || currentEvent.tempId));

    processedEventData.push({
      eventItem: currentEvent,
      layout: {
        col: colIndex >= 0 ? colIndex : 0, // Ensure colIndex is non-negative
        numCols: numColsInGroup > 0 ? numColsInGroup : 1, // Ensure numCols is at least 1
      },
    });
  }
  // Re-sort back to original visibleEvents order if necessary, or ensure caller uses the processed order.
  // For rendering, the order of `processedEventData` (based on sortedEvents) should be fine.
  return processedEventData;
}

interface DraggingEventInfo {
  id: string;
  originalStartTimeMinutes: number;
  originalDurationMinutes: number; // Store original duration
  initialMouseY: number;
  currentTopPxOverride: number | null; // Can be null initially, then number
  originalTopPx: number;
}

interface ResizingEventInfo {
  id: string;
  originalStartTimeMinutes: number;
  originalDurationMinutes: number;
  initialMouseY: number;
  resizeEdge: 'top' | 'bottom';
  originalTopPx: number;
  originalHeightPx: number;
  currentTopPxOverride?: number;    // For top edge resize
  currentHeightPxOverride?: number; // For bottom edge resize
}

export default function ScheduleTimelineGrid({ 
  dayOffset, 
  allScheduleItems,
  onAssignExistingEvent,
  onUnscheduleEvent,
  onEventSelect
}: {
  dayOffset: number; 
  allScheduleItems: any[];
  onAssignExistingEvent?: (eventId: string, dayOffset: number, timeMinutes: number, durationMinutes: number, title: string) => void;
  onUnscheduleEvent?: (eventId: string) => void;
  onEventSelect?: (eventId: string) => void;
}) {
  const theme = useTheme();
  const [viewStartHour, setViewStartHour] = useState(8);
  const [mouseYInGrid, setMouseYInGrid] = useState<number | null>(null);
  const [mouseViewportX, setMouseViewportX] = useState<number | null>(null);
  const [mouseViewportY, setMouseViewportY] = useState<number | null>(null);
  const [tooltipTime, setTooltipTime] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const rowsContainerRef = useRef<HTMLDivElement>(null);

  const [draggingEventInfo, setDraggingEventInfo] = useState<DraggingEventInfo | null>(null);
  const [resizingEventInfo, setResizingEventInfo] = useState<ResizingEventInfo | null>(null);
  const dragOrResizeJustFinishedRef = useRef(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dayOffsetLastInitialized = useRef<number | null>(null);
  const isDefault8AMSetForEmptyDayRef = useRef(false);
  const [draggedEventPlaceholder, setDraggedEventPlaceholder] = useState<{startTimeMinutes: number, durationMinutes: number, dayOffset: number } | null>(null);

  const customSetViewStartHour = useCallback((newHourOrCallback: number | ((prev: number) => number)) => {
    setViewStartHour(prevHour => {
      const nextHour = typeof newHourOrCallback === 'function' ? newHourOrCallback(prevHour) : newHourOrCallback;
      if (prevHour !== nextHour) { 
          isDefault8AMSetForEmptyDayRef.current = false;
      }
      return nextHour;
    });
  }, [setViewStartHour]);

  useEffect(() => {
    const itemsForDay = allScheduleItems.filter(
      item => item.dayOffset === dayOffset && typeof item.startTimeMinutes === 'number'
    );

    if (dayOffset !== dayOffsetLastInitialized.current) {
      if (itemsForDay.length > 0) {
        const earliestMinute = Math.min(...itemsForDay.map(item => item.startTimeMinutes));
        const earliestHour = Math.floor(earliestMinute / 60);
        customSetViewStartHour(Math.max(0, earliestHour));
      } else {
        customSetViewStartHour(8);
        isDefault8AMSetForEmptyDayRef.current = true; 
      }
      dayOffsetLastInitialized.current = dayOffset;
    } else {
      if (isDefault8AMSetForEmptyDayRef.current && itemsForDay.length > 0) {
        const earliestMinute = Math.min(...itemsForDay.map(item => item.startTimeMinutes));
        const earliestHour = Math.floor(earliestMinute / 60);
        customSetViewStartHour(Math.max(0, earliestHour));
      }
    }
  }, [dayOffset, allScheduleItems, customSetViewStartHour]);

  const viewStartMinutes = useMemo(() => viewStartHour * 60, [viewStartHour]);
  const viewEndMinutes = useMemo(() => viewStartMinutes + VISIBLE_WINDOW_HOURS * 60, [viewStartMinutes]);

  const memoizedTimeLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < VISIBLE_WINDOW_ROWS; i++) {
      const totalMinutesOffset = viewStartMinutes + i * INTERVAL_MINUTES;
      const minuteInHour = totalMinutesOffset % 60;
      const currentHour = Math.floor(totalMinutesOffset / 60) % 24;

      if (minuteInHour === 0) { // Only render label for the hour mark
        labels.push(
          <Box
            key={`label-hour-${currentHour}`}
            sx={{
              position: 'absolute',
              top: `${i * ROW_HEIGHT_PX}px`,
              left: 0,
              width: `${TIME_LABEL_WIDTH_PX}px`,
              height: `${ROW_HEIGHT_PX}px`, // Align with the top border of the hour row
              display: 'flex',
              alignItems: 'center', // Vertically center the text in the row height
              justifyContent: 'flex-end',
              pr: 1, // Padding to the right of the text
              boxSizing: 'border-box',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {formatTimeFromMinutes(currentHour * 60).replace(':00 ', '')}
            </Typography>
          </Box>
        );
      }
    }
    return labels;
  }, [viewStartMinutes, theme]); // theme might be used if styling depends on it

  // Global mouse move handler for drag/resize operations
  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    setDraggingEventInfo(prev => {
      if (!prev) return null;
      return { ...prev, currentTopPxOverride: prev.originalTopPx + (e.clientY - prev.initialMouseY) };
    });
    setResizingEventInfo(prev => {
      if (!prev) return null;
      const deltaY = e.clientY - prev.initialMouseY;
      if (prev.resizeEdge === 'top') {
        return { 
          ...prev, 
          currentTopPxOverride: prev.originalTopPx + deltaY, 
          currentHeightPxOverride: Math.max(MIN_EVENT_DURATION_MINUTES / INTERVAL_MINUTES * ROW_HEIGHT_PX, prev.originalHeightPx - deltaY)
        };
      } else { // Bottom edge
        return { 
          ...prev, 
          currentHeightPxOverride: Math.max(MIN_EVENT_DURATION_MINUTES / INTERVAL_MINUTES * ROW_HEIGHT_PX, prev.originalHeightPx + deltaY)
        };
      }
    });
  }, []); // This is correct: only uses state setters.

  // Global mouse up handler to finalize drag/resize
  const handleWindowMouseUp = useCallback((e: MouseEvent) => {
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp); // Essential to remove self

    setDraggingEventInfo(prevInfo => {
      if (!prevInfo) return null;
      if (rowsContainerRef.current && onAssignExistingEvent) {
        const deltaPx = (prevInfo.currentTopPxOverride ?? prevInfo.originalTopPx) - prevInfo.originalTopPx;
        const deltaMinutesFromDrag = Math.round(deltaPx / ROW_HEIGHT_PX) * INTERVAL_MINUTES;
        let newStartTimeMinutes = snapToNearest15Minutes(prevInfo.originalStartTimeMinutes + deltaMinutesFromDrag);
        
        const eventBeingDragged = allScheduleItems.find(item => (item.id || item.tempId) === prevInfo.id);
        const currentEventDuration = eventBeingDragged?.durationMinutes === 0 ? 0 : prevInfo.originalDurationMinutes;

        newStartTimeMinutes = Math.max(0, Math.min(newStartTimeMinutes, (24 * 60) - (currentEventDuration || 0) ));

        const hasChanged = newStartTimeMinutes !== prevInfo.originalStartTimeMinutes || currentEventDuration !== prevInfo.originalDurationMinutes; // Duration doesn't change on drag, but check for completeness

        if (hasChanged) {
          onAssignExistingEvent(prevInfo.id, dayOffset, newStartTimeMinutes, currentEventDuration, eventBeingDragged?.title || 'Scheduled Event');
          dragOrResizeJustFinishedRef.current = true;
        } else {
          // If no change, ensure the flag isn't set, so a zero-movement drag behaves like a click.
          // The click handler will find dragOrResizeJustFinishedRef.current as false (or whatever it was before this mouseup)
        }
      }
      return null;
    });

    setResizingEventInfo(prevInfo => {
      if (!prevInfo) return null;
      if (rowsContainerRef.current && onAssignExistingEvent) {
        const deltaY = e.clientY - prevInfo.initialMouseY;
        let newStartTimeMinutes = prevInfo.originalStartTimeMinutes;
        let newDurationMinutes = prevInfo.originalDurationMinutes;
        const resizeEdge = prevInfo.resizeEdge;

        // Original calculations for newStartTimeMinutes and newDurationMinutes based on deltaY
        if (resizeEdge === 'top') {
          const deltaMinutesFromResize = Math.round(deltaY / ROW_HEIGHT_PX) * INTERVAL_MINUTES;
          newStartTimeMinutes += deltaMinutesFromResize;
          newDurationMinutes -= deltaMinutesFromResize;
        } else { // Bottom edge
          const newHeightPx = Math.max(MIN_EVENT_DURATION_MINUTES / INTERVAL_MINUTES * ROW_HEIGHT_PX, prevInfo.originalHeightPx + deltaY);
          newDurationMinutes = Math.round((newHeightPx / ROW_HEIGHT_PX) * INTERVAL_MINUTES);
        }

        // Apply constraints and snapping
        if (newDurationMinutes < MIN_EVENT_DURATION_MINUTES) {
          if (resizeEdge === 'top') newStartTimeMinutes -= (MIN_EVENT_DURATION_MINUTES - newDurationMinutes);
          newDurationMinutes = MIN_EVENT_DURATION_MINUTES;
        }
        newStartTimeMinutes = Math.max(0, Math.min(newStartTimeMinutes, (24 * 60) - newDurationMinutes));
        newStartTimeMinutes = snapToNearest15Minutes(newStartTimeMinutes);
        
        const originalEndTime = prevInfo.originalStartTimeMinutes + prevInfo.originalDurationMinutes;
        if (resizeEdge === 'top') {
            newDurationMinutes = snapToNearest15Minutes(originalEndTime - newStartTimeMinutes);
        } else { 
            let calculatedNewEndTime = prevInfo.originalStartTimeMinutes + prevInfo.originalDurationMinutes + (Math.round(deltaY / ROW_HEIGHT_PX) * INTERVAL_MINUTES);
            calculatedNewEndTime = snapToNearest15Minutes(calculatedNewEndTime);
            newDurationMinutes = Math.max(MIN_EVENT_DURATION_MINUTES, calculatedNewEndTime - newStartTimeMinutes);
        }

        if (newDurationMinutes < MIN_EVENT_DURATION_MINUTES) newDurationMinutes = MIN_EVENT_DURATION_MINUTES; 
        if (newStartTimeMinutes + newDurationMinutes > 24 * 60) newDurationMinutes = (24 * 60) - newStartTimeMinutes;
        newDurationMinutes = snapToNearest15Minutes(newDurationMinutes);

        const hasChanged = newStartTimeMinutes !== prevInfo.originalStartTimeMinutes || newDurationMinutes !== prevInfo.originalDurationMinutes;

        if (hasChanged) {
          const eventBeingResized = allScheduleItems.find(item => (item.id || item.tempId) === prevInfo.id);
          onAssignExistingEvent(prevInfo.id, dayOffset, newStartTimeMinutes, newDurationMinutes, eventBeingResized?.title || 'Scheduled Event');
          dragOrResizeJustFinishedRef.current = true;
        } else {
           // If no change, ensure the flag isn't set.
        }
      }
      return null;
    });
  }, [dayOffset, onAssignExistingEvent, allScheduleItems, handleWindowMouseMove, viewStartMinutes]);

  // Mouse down on an event card in the timeline
  const handleEventMouseDown = (e: React.MouseEvent, eventItem: any) => {
    e.stopPropagation();
    if (!rowsContainerRef.current || draggingEventInfo || resizingEventInfo) return;

    const isMilestone = eventItem.durationMinutes === 0;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseYRelativeToEvent = e.clientY - rect.top;
    const eventHeight = rect.height;
    
    const eventStartGlobalMinutes = eventItem.startTimeMinutes;
    const originalHeightPx = isMilestone ? ROW_HEIGHT_PX : (eventItem.durationMinutes / INTERVAL_MINUTES) * ROW_HEIGHT_PX; // Use ROW_HEIGHT_PX for milestone height
    
    const originalTopPxInView = ((eventStartGlobalMinutes - viewStartMinutes) / INTERVAL_MINUTES) * ROW_HEIGHT_PX;

    const commonInfo = {
      id: eventItem.id || eventItem.tempId,
      originalStartTimeMinutes: eventStartGlobalMinutes,
      originalDurationMinutes: eventItem.durationMinutes, // Store actual duration, even if 0
      initialMouseY: e.clientY,
      originalTopPx: originalTopPxInView,
    };

    if (!isMilestone) { // Only allow resizing for non-milestone events
      if (mouseYRelativeToEvent <= RESIZE_HANDLE_AREA_PX) {
        setResizingEventInfo({ ...commonInfo, resizeEdge: 'top', originalHeightPx, currentTopPxOverride: originalTopPxInView });
        document.body.style.cursor = 'ns-resize';
      } else if (mouseYRelativeToEvent >= eventHeight - RESIZE_HANDLE_AREA_PX) {
        setResizingEventInfo({ ...commonInfo, resizeEdge: 'bottom', originalHeightPx, currentHeightPxOverride: originalHeightPx });
        document.body.style.cursor = 'ns-resize';
      } else {
        setDraggingEventInfo({ ...commonInfo, currentTopPxOverride: originalTopPxInView });
        document.body.style.cursor = 'grabbing';
      }
    } else { // For milestones, only allow dragging
      setDraggingEventInfo({ ...commonInfo, currentTopPxOverride: originalTopPxInView });
      document.body.style.cursor = 'grabbing';
    }

    setTimeout(() => {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }, 0);
  };

  const handleGridMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!rowsContainerRef.current) return;
    const rect = rowsContainerRef.current.getBoundingClientRect();
    const yInGrid = event.clientY - rect.top;
    const rowIndex = Math.floor(yInGrid / ROW_HEIGHT_PX);
    const actualMinutes = viewStartMinutes + (rowIndex * INTERVAL_MINUTES);
    setMouseYInGrid(yInGrid);
    setMouseViewportX(event.clientX);
    setMouseViewportY(event.clientY);
    setTooltipTime(formatTimeFromMinutes(snapToNearest15Minutes(actualMinutes)));
    setShowTooltip(true);
  }, [viewStartMinutes, setMouseYInGrid, setMouseViewportX, setMouseViewportY, setTooltipTime, setShowTooltip]);

  const handleMouseLeave = useCallback(() => {
    setMouseYInGrid(null);
    setMouseViewportX(null);
    setMouseViewportY(null);
    setShowTooltip(false);
  }, [setMouseYInGrid, setMouseViewportX, setMouseViewportY, setShowTooltip]);

  const stopSmoothScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const startSmoothScroll = useCallback((direction: 'up' | 'down') => {
    stopSmoothScroll(); 
    const scroll = () => {
      customSetViewStartHour(prev => {
        let nextHour;
        if (direction === 'up') {
          nextHour = Math.max(0, prev - 1);
        } else {
          nextHour = Math.min(24 - VISIBLE_WINDOW_HOURS, prev + 1);
        }
        if (nextHour === prev) { 
          stopSmoothScroll();
        }
        return nextHour;
      });
    };
    scroll(); 
    scrollIntervalRef.current = setInterval(scroll, 100); 
  }, [stopSmoothScroll, customSetViewStartHour]);

  useEffect(() => {
    // Cleanup scroll interval on unmount
    return stopSmoothScroll;
  }, [stopSmoothScroll]);

  const renderEventCards = () => {
    const dayScheduleItems = allScheduleItems.filter(item => 
      item.dayOffset === dayOffset && typeof item.startTimeMinutes === 'number' && 
      // Allow duration 0 for milestones, positive for others
      (item.durationMinutes === 0 || (typeof item.durationMinutes === 'number' && item.durationMinutes > 0))
    );

    const visibleEventsInWindow = dayScheduleItems.filter(eventItem => {
      // For milestones, they are visible if their start time is in view.
      // For others, use existing start/end logic.
      if (eventItem.durationMinutes === 0) {
        return eventItem.startTimeMinutes >= viewStartMinutes && eventItem.startTimeMinutes < viewEndMinutes;
      }
      const eventEndMinutes = eventItem.startTimeMinutes + eventItem.durationMinutes;
      return !(eventEndMinutes <= viewStartMinutes || eventItem.startTimeMinutes >= viewEndMinutes);
    });

    if (visibleEventsInWindow.length === 0) return null;
    const processedEventsData = calculateLayout(visibleEventsInWindow);

    return processedEventsData.map(eventData => {
      const { eventItem, layout } = eventData;
      const eventStartMinutes = eventItem.startTimeMinutes;
      const isMilestone = eventItem.durationMinutes === 0;
      const eventTypeColor = EVENT_TYPES.find(t => t.value === eventItem.eventType)?.color || DEFAULT_EVENT_COLOR;
      
      const isBeingDragged = draggingEventInfo && (eventItem.id || eventItem.tempId) === draggingEventInfo.id;
      // Milestones cannot be resized, so isBeingResized will effectively be false for them due to handleEventMouseDown logic
      const isBeingResized = !isMilestone && resizingEventInfo && (eventItem.id || eventItem.tempId) === resizingEventInfo.id;
      
      let topPx, heightPx;

      if (isBeingDragged && draggingEventInfo.currentTopPxOverride !== null) {
        topPx = draggingEventInfo.currentTopPxOverride;
      } else if (isBeingResized && resizingEventInfo.currentTopPxOverride !== undefined && resizingEventInfo.resizeEdge === 'top') {
        topPx = resizingEventInfo.currentTopPxOverride;
      } else {
        topPx = ((eventStartMinutes - viewStartMinutes) / INTERVAL_MINUTES) * ROW_HEIGHT_PX;
      }
      
      if (isMilestone) {
        heightPx = ROW_HEIGHT_PX; // Fixed height for milestone row
      } else if (isBeingResized && resizingEventInfo.currentHeightPxOverride !== undefined) {
        heightPx = resizingEventInfo.currentHeightPxOverride;
      } else {
        heightPx = (eventItem.durationMinutes / INTERVAL_MINUTES) * ROW_HEIGHT_PX;
      }

      if ((isBeingDragged || isBeingResized) && heightPx <=0 ) {
        heightPx = ROW_HEIGHT_PX * (MIN_EVENT_DURATION_MINUTES / INTERVAL_MINUTES);
      }
      if (isMilestone && heightPx <=0 && !(isBeingDragged || isBeingResized) ) heightPx = ROW_HEIGHT_PX;


      // If not a milestone, and duration is <=0 and not being manipulated, don't render. Milestones are handled above.
      if (!isMilestone && eventItem.durationMinutes <= 0 && !isBeingDragged && !isBeingResized) return null;

      const C_TIME_LABEL_AREA_WIDTH = `${TIME_LABEL_WIDTH_PX + 4}px`;
      const C_TOTAL_HORIZONTAL_PADDING = `${TIME_LABEL_WIDTH_PX + 4 + 4}px`; 
      const singleColumnBaseWidthExpr = `( (100% - ${C_TOTAL_HORIZONTAL_PADDING}) / ${layout.numCols} )`;
      const gapAdjustForWidth = layout.numCols > 1 ? `( (${layout.numCols} - 1) * ${EVENT_HORIZONTAL_GAP_PX}px / ${layout.numCols} )` : '0px';
      const calculatedWidth = `calc(${singleColumnBaseWidthExpr} - ${gapAdjustForWidth})`;
      const spacePerColumnIncGap = `calc( (${singleColumnBaseWidthExpr}) )`;
      const calculatedLeft = `calc(${C_TIME_LABEL_AREA_WIDTH} + ${layout.col} * (${spacePerColumnIncGap}))`;
      
      const commonSx = {
        position: 'absolute', top: `${topPx}px`, left: calculatedLeft, width: calculatedWidth, 
        cursor: 'grab', boxSizing: 'border-box',
        transition: 'background-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        border: '1px solid transparent', opacity: (isBeingDragged || isBeingResized) ? 0.7 : 1, 
        userSelect: 'none', 
        zIndex: (isBeingDragged || isBeingResized) ? 20 : (layout.col + 1),
         '&:hover': { 
            filter: 'brightness(85%)', 
            boxShadow: (isBeingDragged || isBeingResized) ? '0px 8px 16px rgba(0,0,0,0.3)' : '0px 4px 12px rgba(0,0,0,0.2)', 
            zIndex: (isBeingDragged || isBeingResized) ? 20 : 15,
        }
      };

      if (isMilestone) {
        return (
          <Tooltip title={`${eventItem.title} - ${formatTimeFromMinutes(eventStartMinutes)}`} placement="top" arrow key={eventItem.id || eventItem.tempId}>
            <Paper
              elevation={isBeingDragged ? 4 : 1} // Less prominent elevation for milestones
              onMouseDown={(e) => handleEventMouseDown(e, eventItem)}
              onClick={() => {
                const eventId = eventItem.id || eventItem.tempId;
                const wasDragOrResize = dragOrResizeJustFinishedRef.current; // Capture state
                console.log('[ScheduleTimelineGrid] Milestone Card Clicked. ID:', eventId, 'dragOrResizeJustFinishedRef was:', wasDragOrResize);
                if (wasDragOrResize) {
                  dragOrResizeJustFinishedRef.current = false; // Consume the flag
                  console.log('[ScheduleTimelineGrid] Action (Milestone): Consumed drag/resize flag. onEventSelect NOT called. Ref now false.');
                } else if (onEventSelect && eventId) {
                  console.log('[ScheduleTimelineGrid] Action (Milestone): Genuine click. Calling onEventSelect. Ref was already false.');
                  onEventSelect(eventId);
                } else {
                  console.log('[ScheduleTimelineGrid] Action (Milestone): Genuine click, but onEventSelect/eventId missing. Ref was false.');
                }
              }}
              // No resize cursor for milestones
              onMouseMove={(e) => { if (!(draggingEventInfo || resizingEventInfo)) e.currentTarget.style.cursor = 'grab';}}
              onMouseLeave={(e) => { if (!(draggingEventInfo || resizingEventInfo)) e.currentTarget.style.cursor = 'grab'; }}
              sx={{
                ...commonSx,
                height: `${heightPx}px`, // Fixed height for milestone display
                backgroundColor: alpha(eventTypeColor, 0.7), // Slightly transparent
                color: theme.palette.getContrastText(alpha(eventTypeColor, 0.7)),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start', // Align icon and text to the left
                p: '0 4px', // Minimal padding
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <FlagIcon sx={{ fontSize: MILESTONE_ICON_SIZE, mr: 0.5, color: 'inherit' }} />
              <Typography variant="caption" component="div" sx={{ fontWeight: 'medium', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: `${heightPx}px` }}>
                {eventItem.title || 'Milestone'}
              </Typography>
              {onUnscheduleEvent && (eventItem.id || eventItem.tempId) && (
                <IconButton aria-label="Unschedule event" onClick={(e) => { e.stopPropagation(); onUnscheduleEvent(eventItem.id || eventItem.tempId); }}
                  size="small" sx={{ position: 'absolute', top: 0, right: 0, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.2)', p: '2px', m: '2px', '&:hover': {color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)'} }}>
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              )}
            </Paper>
          </Tooltip>
        );
      }

      // Regular event card rendering
      return (
        <Paper
          key={eventItem.id || eventItem.tempId}
          elevation={isBeingDragged ? 4 : 2}
          onMouseDown={(e) => handleEventMouseDown(e, eventItem)}
          onClick={() => {
            const eventId = eventItem.id || eventItem.tempId;
            const wasDragOrResize = dragOrResizeJustFinishedRef.current; // Capture state
            console.log('[ScheduleTimelineGrid] Event Card Clicked. ID:', eventId, 'dragOrResizeJustFinishedRef was:', wasDragOrResize);
            if (wasDragOrResize) {
                dragOrResizeJustFinishedRef.current = false; // Consume the flag
                console.log('[ScheduleTimelineGrid] Action (Regular Event): Consumed drag/resize flag. onEventSelect NOT called. Ref now false.');
            } else if (onEventSelect && eventId) {
              console.log('[ScheduleTimelineGrid] Action (Regular Event): Genuine click. Calling onEventSelect. Ref was already false.');
              onEventSelect(eventId);
            } else {
              console.log('[ScheduleTimelineGrid] Action (Regular Event): Genuine click, but onEventSelect/eventId missing. Ref was false.');
            }
          }}
          onMouseMove={(e) => {
            if (draggingEventInfo || resizingEventInfo) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const mouseYRelativeToEvent = e.clientY - rect.top;
            if (mouseYRelativeToEvent <= RESIZE_HANDLE_AREA_PX || mouseYRelativeToEvent >= rect.height - RESIZE_HANDLE_AREA_PX) {
              e.currentTarget.style.cursor = 'ns-resize';
            } else {
              e.currentTarget.style.cursor = 'grab';
            }
          }}
          onMouseLeave={(e) => { if (!(draggingEventInfo || resizingEventInfo)) e.currentTarget.style.cursor = 'grab'; }}
          sx={{
            ...commonSx,
            height: `${heightPx}px`,
            backgroundColor: eventTypeColor, color: '#fff', p: 0.5, borderRadius: '4px', overflow: 'hidden',
            fontSize: '0.75rem', 
          }}
        >
          {onUnscheduleEvent && (eventItem.id || eventItem.tempId) && (
            <IconButton aria-label="Unschedule event" onClick={(e) => { e.stopPropagation(); onUnscheduleEvent(eventItem.id || eventItem.tempId); }}
              size="small" sx={{ position: 'absolute', top: 0, right: 0, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.2)', p: '2px', m: '2px', '&:hover': {color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)'} }}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          )}
          <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pr: onUnscheduleEvent ? '20px' : 0 }}>
            {eventItem.title || 'Scheduled Event'}
          </Typography>
          <Typography variant="caption" component="div" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatTimeFromMinutes(eventStartMinutes)} - {formatTimeFromMinutes(eventStartMinutes + eventItem.durationMinutes)}
          </Typography>
        </Paper>
      );
    });
  };

  const memoizedRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < VISIBLE_WINDOW_ROWS; i++) {
      const totalMinutesOffset = viewStartMinutes + i * INTERVAL_MINUTES;
      const minuteInHour = totalMinutesOffset % 60;
      const isHourRow = minuteInHour === 0;

      rows.push(
        <Box
          key={`row-${i}`}
          sx={{
            height: `${ROW_HEIGHT_PX}px`,
            borderBottom: `1px dashed ${theme.palette.grey[400]}`,
            borderTop: isHourRow ? `1px solid ${theme.palette.primary.dark}` : 'none',
            position: 'relative',
            boxSizing: 'border-box',
            backgroundColor: i % 2 === 0 ? 'transparent' : alpha(theme.palette.grey[500], 0.03),
            marginLeft: `${TIME_LABEL_WIDTH_PX}px`, 
            width: `calc(100% - ${TIME_LABEL_WIDTH_PX}px)`,
          }}
        />
      );
    }
    return rows;
  }, [viewStartMinutes, theme]);

  useEffect(() => {
    // Effect for cleaning up global listeners on unmount
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      document.body.style.cursor = '';
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  return (
    <Box sx={{ width: '100%', minWidth: 180, background: '#f5faff', borderRadius: 1, overflow: 'hidden', border: '1px solid #e3f2fd', position: 'relative' }}>
      {viewStartHour > 0 && (
        <Button fullWidth onMouseDown={() => startSmoothScroll('up')} onMouseUp={stopSmoothScroll} onMouseLeave={stopSmoothScroll}
          sx={{ justifyContent: 'center', py: 0.5, mb: 0.5, borderTopLeftRadius:0, borderTopRightRadius:0  }}>
          <KeyboardArrowUpIcon />
        </Button>
      )}
      <Box 
        ref={rowsContainerRef}
        sx={{ cursor: 'crosshair', height: VISIBLE_WINDOW_ROWS * ROW_HEIGHT_PX, overflow: 'hidden', position: 'relative' }}
        onMouseMove={handleGridMouseMove} 
        onMouseLeave={handleMouseLeave} 
        onDragEnter={(e) => {
          e.preventDefault();
        }}
        onDragOver={(e) => { 
          e.preventDefault(); 
          e.dataTransfer.dropEffect = "move";
          const jsonData = e.dataTransfer.getData("application/json");
          let eventDurationMinutes = 30; // Default if not specified or milestone
          let isDroppedItemMilestone = false;

          if (jsonData) {
            try {
              const droppedItemData = JSON.parse(jsonData);
              // If duration is 0, it's a milestone and keeps 0 duration.
              // Otherwise, use its duration or default to 30.
              eventDurationMinutes = droppedItemData.durationMinutes === 0 ? 0 : (droppedItemData.durationMinutes || 30);
              isDroppedItemMilestone = droppedItemData.durationMinutes === 0;
            } catch (err) { /* console.warn("Could not parse drag data in onDragOver", err); */ }
          }
          if (!rowsContainerRef.current) return;
          const rect = rowsContainerRef.current.getBoundingClientRect();
          const yInGrid = e.clientY - rect.top;
          const rowIndex = Math.floor(yInGrid / ROW_HEIGHT_PX);
          const minutesInView = (rowIndex * INTERVAL_MINUTES) + (isDroppedItemMilestone ? 0 : INTERVAL_MINUTES); // Snap to top of cell for milestone, middle/next for others
          let newStartTimeMinutes = snapToNearest15Minutes(viewStartMinutes + minutesInView);
          newStartTimeMinutes = Math.max(0, Math.min(newStartTimeMinutes, (24*60) - eventDurationMinutes));
          
          // For milestones, placeholder duration will also be 0, handled by rendering logic.
          // For others, use the calculated/default eventDurationMinutes.
          setDraggedEventPlaceholder({ 
            startTimeMinutes: newStartTimeMinutes, 
            durationMinutes: eventDurationMinutes, 
            dayOffset: dayOffset
          });
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDraggedEventPlaceholder(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDraggedEventPlaceholder(null);
          const jsonData = e.dataTransfer.getData("application/json");
          if (!jsonData) return;
          try {
            const { id: eventId, durationMinutes: droppedDuration, title: eventTitle, isNewlyCreated } = JSON.parse(jsonData);
            // If duration is explicitly 0 from drag data, it's a milestone.
            // Otherwise, use its duration or default to 30 if it was a new item without duration.
            const finalDroppedDuration = droppedDuration === 0 ? 0 : (droppedDuration || (isNewlyCreated ? 30 : MIN_EVENT_DURATION_MINUTES));

            if (!rowsContainerRef.current || !onAssignExistingEvent) return;
            const rect = rowsContainerRef.current.getBoundingClientRect();
            const yInGrid = e.clientY - rect.top;
            const rowIndex = Math.floor(yInGrid / ROW_HEIGHT_PX);
            // For milestones, snap to the start of the cell. Others, allow snapping to midpoint/next cell.
            const minutesInView = (rowIndex * INTERVAL_MINUTES) + (finalDroppedDuration === 0 ? 0 : INTERVAL_MINUTES);
            let droppedStartTimeMinutes = snapToNearest15Minutes(viewStartMinutes + minutesInView);
            
            // Ensure event doesn't go out of bounds
            droppedStartTimeMinutes = Math.max(0, Math.min(droppedStartTimeMinutes, (24*60) - finalDroppedDuration)); 
            
            onAssignExistingEvent(eventId, dayOffset, droppedStartTimeMinutes, finalDroppedDuration, eventTitle);
          } catch (error) { console.error("Failed to handle drop:", error); }
        }}
      >
        {memoizedTimeLabels}
        {memoizedRows}
        {renderEventCards()} 
        {draggedEventPlaceholder && draggedEventPlaceholder.dayOffset === dayOffset && (
          <Paper 
            elevation={1} 
            sx={{
              position: 'absolute',
              top: `${((Math.max(viewStartMinutes, draggedEventPlaceholder.startTimeMinutes) - viewStartMinutes) / INTERVAL_MINUTES) * ROW_HEIGHT_PX}px`,
              left: `${TIME_LABEL_WIDTH_PX + 4 + EVENT_HORIZONTAL_GAP_PX}px`, 
              width: `calc(100% - ${TIME_LABEL_WIDTH_PX + 4 + EVENT_HORIZONTAL_GAP_PX*2}px)`,
              // For milestones (duration 0), use ROW_HEIGHT_PX for placeholder. Otherwise, calculate.
              height: `${draggedEventPlaceholder.durationMinutes === 0 ? ROW_HEIGHT_PX : (draggedEventPlaceholder.durationMinutes / INTERVAL_MINUTES) * ROW_HEIGHT_PX}px`,
              backgroundColor: draggedEventPlaceholder.durationMinutes === 0 ? alpha(theme.palette.primary.light, 0.2) :'rgba(0, 0, 0, 0.1)',
              border: `2px dashed ${draggedEventPlaceholder.durationMinutes === 0 ? theme.palette.primary.main : 'rgba(0,0,0,0.3)'}`,
              borderRadius: '4px',
              zIndex: 5, 
              pointerEvents: 'none',
              boxSizing: 'border-box',
              display: 'flex', // For milestone placeholder text/icon
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {draggedEventPlaceholder.durationMinutes === 0 && (
              <Typography variant="caption" color="textSecondary">Place Milestone</Typography>
            )}
          </Paper>
        )}
        {mouseYInGrid !== null && mouseViewportX !== null && mouseViewportY !== null && showTooltip && tooltipTime && rowsContainerRef.current && (
          <Tooltip open title={tooltipTime} placement="right" arrow PopperProps={{
              anchorEl: {
                getBoundingClientRect: () => ({
                  top: mouseViewportY || 0,
                  left: rowsContainerRef.current?.getBoundingClientRect().left || 0,
                  right: (rowsContainerRef.current?.getBoundingClientRect().left || 0),
                  bottom: mouseViewportY || 0,
                  width: 0, height: 0,
                  x: rowsContainerRef.current?.getBoundingClientRect().left || 0,
                  y: mouseViewportY || 0, 
                  toJSON: () => ({}), 
                }),
              },
              style: { pointerEvents: 'none' } }}
            componentsProps={{ tooltip: { sx: { bgcolor: 'rgba(0,0,0,0.8)', fontSize: '0.75rem', p: '4px 8px', transform: 'translate(10px, -50%)'} } }}>
            <span />
          </Tooltip>
        )}
      </Box>
      {viewStartHour + VISIBLE_WINDOW_HOURS < 24 && (
        <Button fullWidth onMouseDown={() => startSmoothScroll('down')} onMouseUp={stopSmoothScroll} onMouseLeave={stopSmoothScroll}
          sx={{ justifyContent: 'center', py: 0.5, mt: 0.5, borderBottomLeftRadius:0, borderBottomRightRadius:0 }}>
          <KeyboardArrowDownIcon />
        </Button>
      )}
    </Box>
  );
} 