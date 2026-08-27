# Quick Reference: Using the New Features

## Feature 1: Time Zone Support (#384)

### Usage in Components
```tsx
import TimeZoneSelector, { 
  detectUserTimezone, 
  formatDateInTimezone 
} from './TimeZoneSelector';

// Detect user timezone
const userTz = detectUserTimezone(); // Returns 'America/New_York', etc.

// Format dates in specific timezone
const formatted = formatDateInTimezone(
  new Date(), 
  'America/New_York',
  { year: 'numeric', month: 'short', day: 'numeric' }
);

// Add selector to UI
const [timezone, setTimezone] = useState(detectUserTimezone());
<TimeZoneSelector 
  selectedTimezone={timezone}
  onTimezoneChange={setTimezone}
  compact={false}
/>
```

### Available Timezones
UTC, America/*, Europe/*, Africa/*, Asia/*, Australia/*, Pacific/* (40+ zones)

---

## Feature 2: Copy Anchor Links (#385)

### Toast Notifications
```tsx
import { useToast } from './Toast';

const { success, error, info, warning, dismiss } = useToast();

// Show notifications
success('Link copied!', 2000); // auto-dismiss after 2 seconds
error('Failed to copy');
info('Processing...');
warning('Please check this');

// Get toast messages for rendering
const { messages } = useToast();
<Toast messages={messages} />
```

### RedocViewer Copy Feature
Automatically enabled in RedocViewer when:
- Deep link is present in URL hash
- RedocViewer is focused
- User clicks the 🔗 Copy Link button

---

## Feature 3: Endpoint Comparison (#386)

### Integration in IntegratedApiReference
```tsx
// Toggle button automatically added to search bar
// Click "⇄ Compare" to enter comparison mode

// In comparison mode:
// 1. Click endpoint in sidebar to select first endpoint
// 2. Click another endpoint to select second endpoint
// 3. View side-by-side comparison with highlighted differences
// 4. Click endpoint in comparison view to navigate
// 5. Click X to close comparison
```

### Use Cases
- Compare GET vs GET with ID (different parameters)
- Compare POST vs PUT (different request bodies)
- Compare v1 and v2 of same endpoint
- Review parameter differences before deprecation

---

## Feature 4: Per-Tag Filtering (#387)

### How It Works
Each tag group has independent filters:

1. **Search Box** - Filter by path, method, or summary
   - Real-time filtering as you type
   - Case-insensitive search
   - Only affects current tag

2. **Method Buttons** - Quick filter by HTTP method
   - GET, POST, PUT, PATCH, DELETE
   - Click to toggle on/off
   - Multiple methods can be active
   - Count shows "3/15" when filtered

### Examples
```
Tag: "Users"
  Search: "list" → Shows only endpoints with "list" in name
  Click: GET button → Shows only GET endpoints in this tag
  
Tag: "Transactions"  
  Filters are independent from "Users" tag
```

---

## Styling & Customization

### CSS Variables Used (via Docusaurus theme)
- `--ifm-color-primary` - Primary action color
- `--ifm-background-color` - Page background
- `--ifm-font-color-base` - Text color
- `--ifm-color-emphasis-*` - Emphasis colors

### Responsive Breakpoints
- 1024px: Comparison modal adjustments
- 768px: Copy button text hidden, compact styles

---

## Accessibility Features

All new features include:
- ✅ ARIA labels on buttons and inputs
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader friendly
- ✅ Color-independent indication
- ✅ Reduced motion support
- ✅ High contrast mode support

---

## Component Props Reference

### TimeZoneSelector
```tsx
interface TimeZoneSelectorProps {
  selectedTimezone?: string;           // Current timezone
  onTimezoneChange?: (tz: string) => void;  // Timezone changed
  compact?: boolean;                   // Use <select> instead of dropdown
}
```

### Toast
```tsx
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;  // ms, 0 = manual only
}
```

### EndpointComparison
```tsx
interface EndpointComparisonProps {
  endpoint1?: ParsedEndpoint;          // First endpoint
  endpoint2?: ParsedEndpoint;          // Second endpoint
  onClose?: () => void;                // Close comparison
  onSelect?: (endpoint) => void;       // Select from comparison
}
```

---

## Testing Tips

### Time Zone
- Test with different system timezones
- Verify localStorage saves preference
- Check DST transitions

### Copy Link
- Test with different endpoints
- Verify toast appears and dismisses
- Test on mobile (button should still work)

### Comparison
- Compare endpoints with same structure
- Compare endpoints with different parameters
- Test with deprecated endpoints

### Filtering
- Test search with special characters
- Test multiple method filters active
- Test switching between tags
- Verify filters reset when tag collapses

---

## Common Issues & Solutions

### Toast not showing?
- Ensure `<Toast messages={messages} />` is rendered
- Check that useToast hook is called
- Verify messages array is passed

### Copy not working?
- Check browser supports Clipboard API
- Verify hash is in URL (copy button only shows with hash)
- Check window.location.href has full URL

### Filters not working?
- Verify you're searching within expanded tag
- Check search text is entered in correct input
- Verify method buttons are inside tagFilterBar

### Timezone not persisting?
- Check localStorage is enabled in browser
- Verify no privacy mode/incognito
- Check browser storage limit not exceeded

---

## Performance Considerations

- Timezone detection is instantaneous
- Toast uses requestAnimationFrame for smooth animations  
- Comparison grid uses CSS Grid (native browser optimization)
- Per-tag filters only process visible endpoints
- No virtual scrolling needed for typical endpoint counts

---

## Browser Support

- Chrome/Edge 88+
- Firefox 87+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

Requires ES2020 support for:
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- Promise API
- Clipboard API
