# Manual Testing Checklist

## Convention Listing Management

### 1. Public Convention Listing (`/conventions`)
- [x] Page loads without errors
- [x] Shows ACTIVE conventions by default
- [x] Toggle switch between ACTIVE and PAST conventions works
- [x] Background color changes to light blue when viewing PAST conventions
- [x] Toggle state persists across page refreshes
- [x] Toggle state is reflected in URL parameters
- [x] Pagination works correctly
- [x] Search functionality works
- [x] Filter panel works (status, type, etc.)
- [x] Convention cards show correct information
- [x] Clicking a convention navigates to details page
- [x] Mobile responsive layout works

### 2. Organizer Convention Management (`/organizer/conventions`)
- [x] Page loads without errors
- [ ] Shows all conventions for the logged-in organizer
- [x] Authentication works (redirects to login if not logged in)
- [x] Authentication works (redirects to front page if not authorized)
- [ ] Authorization works (only shows organizer's conventions)
- [ ] Mobile responsive layout works

### 3. Convention Actions
- [ ] Edit Convention
  - [ ] Edit button opens form
  - [ ] Form pre-populates with existing data
  - [ ] Validation works
  - [ ] Success message shows on save
  - [ ] Error message shows on failure
  - [ ] Changes reflect immediately in list

- [ ] Delete Convention
  - [ ] Delete button shows confirmation dialog
  - [ ] Confirmation works
  - [ ] Convention disappears from list after deletion
  - [ ] Error handling works

- [ ] Duplicate Convention
  - [ ] Duplicate button works
  - [ ] New convention is created as DRAFT
  - [ ] All details are copied correctly
  - [ ] New convention appears in list

- [ ] Status Change
  - [ ] Status change button works
  - [ ] All valid statuses are available
  - [ ] Status updates immediately
  - [ ] Validation works (e.g., can't set to ACTIVE without required fields)

### 4. Bulk Operations
- [ ] Selection
  - [ ] Checkbox selection works
  - [ ] Select all works
  - [ ] Selection persists across pagination

- [ ] Bulk Delete
  - [ ] Bulk delete button appears when items selected
  - [ ] Confirmation dialog shows
  - [ ] Selected items are deleted
  - [ ] Error handling works

- [ ] Bulk Status Change
  - [ ] Bulk status change button appears when items selected
  - [ ] Status selection works
  - [ ] All selected items update
  - [ ] Error handling works

### 5. Error Handling
- [ ] Network errors show appropriate messages
- [ ] Validation errors show appropriate messages
- [ ] Authorization errors redirect appropriately
- [ ] Server errors show appropriate messages

### 6. Performance
- [x] Page loads quickly
- [x] Actions respond quickly
- [x] No unnecessary re-renders
- [x] Smooth pagination

### 7. Accessibility
- [ ] All buttons have proper labels
- [ ] All forms have proper labels
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets standards

### 8. Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 9. Mobile Testing
- [ ] iPhone
- [ ] Android
- [ ] Tablet
- [ ] Responsive layout
- [ ] Touch interactions

## Notes
- Test with different user roles (Organizer, Admin)
- Test with various data scenarios (empty list, many items, etc.)
- Document any issues found during testing
- Verify all error messages are user-friendly
- Check all loading states and transitions 