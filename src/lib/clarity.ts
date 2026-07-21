// Deterministic Microsoft Clarity custom events. Clarity's auto "smart
// events" guess intent from ML (it labeled Register clicks "book"); firing
// named events from the actual CTAs gives analytics one stable vocabulary:
//   register_click     — convention registration (THE conversion)
//   book_talent_click  — booking a performer from a talent profile
//   book_room_click    — hotel room-block booking links
// No-op when Clarity isn't loaded (dev) or is blocked by the visitor.
export function clarityEvent(name: string): void {
    try {
        (window as any).clarity?.('event', name);
    } catch {
        // Analytics must never break the click.
    }
}
