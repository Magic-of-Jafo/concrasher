// Regression coverage for the Venue/Hotel helper apply flow. The dialog is
// mocked to fire onApplied directly; the harness mimics ConventionEditorTabs'
// value-state wiring. Bug history: additional hotels were hidden entirely
// whenever guestsStayAtPrimaryVenue was true, so helper-applied secondary
// hotels appeared to vanish (Magic in Orlando, 2026-07-21).
import React, { useState, useCallback } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import VenueHotelTab from '@/components/organizer/convention-editor/VenueHotelTab';
import { createDefaultVenueHotelTabData, createDefaultHotel, VenueHotelTabData } from '@/lib/validators';

// Mock the helper dialog: clicking "MOCK APPLY" fires onApplied with the exact
// scenario from the bug report — first place skipped, three secondary hotels.
jest.mock('@/components/organizer/convention-editor/VenueHotelHelperDialog', () => {
  const React = require('react');
  const scraped = (name: string) => ({
    name, websiteUrl: null, googleMapsUrl: null, streetAddress: '123 St', city: 'Orlando',
    stateRegion: 'FL', postalCode: null, country: 'United States', contactEmail: null,
    contactPhone: null, description: null, amenities: [], parkingInfo: null,
    publicTransportInfo: null, groupPrice: null, groupRateOrBookingCode: null,
    bookingLink: null, bookingCutoffDate: null,
  });
  return {
    __esModule: true,
    default: (props: any) => React.createElement('button', {
      onClick: () => props.onApplied({
        places: [
          { place: scraped('Rosen Plaza'), role: 'skip' },
          { place: scraped('Hotel Two'), role: 'secondaryHotel' },
          { place: scraped('Hotel Three'), role: 'secondaryHotel' },
          { place: scraped('Hotel Four'), role: 'secondaryHotel' },
        ],
      }),
    }, 'MOCK APPLY'),
  };
});

const theme = createTheme();

// Harness mimicking ConventionEditorTabs' wiring: value state fed back via onChange.
function Harness({ report, stayAtVenue = false }: { report: (d: any) => void; stayAtVenue?: boolean }) {
  const [value, setValue] = useState<VenueHotelTabData>(() => {
    const base = createDefaultVenueHotelTabData();
    const primary = { ...createDefaultHotel(true), hotelName: 'Existing Primary Hotel', id: 'h1' };
    return stayAtVenue
      ? ({ ...base, hotels: [], guestsStayAtPrimaryVenue: true } as any)
      : ({ ...base, hotels: [primary], guestsStayAtPrimaryVenue: false } as any);
  });
  const onChange = useCallback((data: any) => { setValue(data); report(data); }, [report]);
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
      <VenueHotelTab
        conventionId="conv1"
        value={value as any}
        onChange={onChange}
        onValidationChange={() => {}}
        schema={{ safeParse: () => ({ success: true }) } as any}
      />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

test('helper apply with skip + three secondary hotels adds all three', () => {
  const reports: any[] = [];
  render(<Harness report={(d) => reports.push(d)} />);

  fireEvent.click(screen.getByText('MOCK APPLY'));

  expect(reports.length).toBeGreaterThan(0);
  const last = reports[reports.length - 1];
  const names = (last.hotels || []).map((h: any) => h.hotelName);
  expect(names).toContain('Existing Primary Hotel');
  expect(names).toContain('Hotel Two');
  expect(names).toContain('Hotel Three');
  expect(names).toContain('Hotel Four');

  // And they must actually RENDER as additional-hotel accordions.
  expect(screen.getByText('Hotel Two')).toBeInTheDocument();
  expect(screen.getByText('Hotel Four')).toBeInTheDocument();
});

test('stay-at-venue ON: applied secondary hotels still render (regression)', () => {
  const reports: any[] = [];
  render(<Harness stayAtVenue report={(d) => reports.push(d)} />);

  fireEvent.click(screen.getByText('MOCK APPLY'));

  const last = reports[reports.length - 1];
  const names = (last.hotels || []).map((h: any) => h.hotelName);
  expect(names).toEqual(expect.arrayContaining(['Hotel Two', 'Hotel Three', 'Hotel Four']));

  // The old gating hid these entirely when guestsStayAtPrimaryVenue was true.
  expect(screen.getByText('Hotel Two')).toBeInTheDocument();
  expect(screen.getByText('Hotel Three')).toBeInTheDocument();
  expect(screen.getByText('Hotel Four')).toBeInTheDocument();
  // The separate primary-hotel form stays hidden in this mode.
  expect(screen.queryByText(/Primary Hotel \(/)).not.toBeInTheDocument();
});
