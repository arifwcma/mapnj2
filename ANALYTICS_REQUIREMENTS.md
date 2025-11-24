# Analytics Feature Requirements

## Overview
Implement user interaction analytics tracking system with zero performance impact on user experience. All analytics operations must be completely asynchronous and non-blocking.

## Performance Requirements

### Critical Performance Constraints
1. **Zero UI Blocking**: All analytics calls must be fire-and-forget (no await in user-facing code paths)
2. **Async Queue System**: Events are queued locally and processed asynchronously
3. **Batching**: Events are batched and sent periodically (every 5-10 seconds or on page unload)
4. **Debouncing**: Frequent events (map movements, zoom changes) are debounced/throttled
5. **Error Isolation**: Analytics failures must never affect app functionality (all wrapped in try/catch)
6. **Background Processing**: Use requestIdleCallback or setTimeout for non-critical operations
7. **Local Buffering**: Store events in sessionStorage/localStorage as backup before sending

### Performance Targets
- Analytics overhead: < 1ms per event (queuing only)
- No visible lag in UI interactions
- Batch processing: Max 50 events per batch
- Debounce intervals: 2 seconds for map movements, 1 second for zoom changes

## Technical Architecture

### Database Schema
Already exists in `app/lib/db.js`:
```sql
CREATE TABLE analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    data TEXT,
    timestamp INTEGER NOT NULL
);
```

### Event Queue System
1. **In-Memory Queue**: Array-based queue for immediate event storage
2. **Local Storage Backup**: Persist queue to sessionStorage for reliability
3. **Batch Processor**: Process queue every 5-10 seconds or when queue reaches 50 events
4. **Page Unload Handler**: Send all queued events on beforeunload event

### API Endpoint
- **Route**: `/api/analytics/log`
- **Method**: POST
- **Body**: `{ events: Array<{event_type: string, data: object, timestamp: number}> }`
- **Response**: `{ success: boolean }`

## Trackable Events

### Map Interactions

#### `map_click`
- **Trigger**: User clicks on map (point selection)
- **Metadata**:
  - `lat` (number): Latitude
  - `lon` (number): Longitude
  - `zoom` (number): Current zoom level
  - `analysis_mode` (string): "point" | "area"
  - `compare_mode` (string): "points" | "areas" | "months"
  - `bounds` (array): Current map bounds [[lat1, lon1], [lat2, lon2]]

#### `map_pan`
- **Trigger**: User drags/pans the map
- **Debounce**: 2 seconds
- **Metadata**:
  - `bounds` (array): New map bounds
  - `zoom` (number): Current zoom level

#### `map_zoom`
- **Trigger**: User zooms in/out
- **Debounce**: 1 second
- **Metadata**:
  - `zoom` (number): New zoom level
  - `bounds` (array): Current map bounds

### Mode & Settings Changes

#### `analysis_mode_change`
- **Trigger**: User changes analysis mode (point ↔ area)
- **Metadata**:
  - `previous_mode` (string): "point" | "area"
  - `new_mode` (string): "point" | "area"

#### `compare_mode_change`
- **Trigger**: User changes compare mode
- **Metadata**:
  - `previous_mode` (string): "points" | "areas" | "months"
  - `new_mode` (string): "points" | "areas" | "months"
  - `analysis_mode` (string): Current analysis mode

#### `basemap_change`
- **Trigger**: User changes basemap
- **Metadata**:
  - `previous_basemap` (string): Previous basemap name
  - `new_basemap` (string): "street" | "satellite" | "topographic"

#### `cloud_tolerance_change`
- **Trigger**: User changes cloud tolerance slider
- **Debounce**: 1 second (matches existing debounce)
- **Metadata**:
  - `previous_value` (number): Previous cloud tolerance (0-100)
  - `new_value` (number): New cloud tolerance (0-100)

### Point Analysis

#### `point_added`
- **Trigger**: User adds a point to analysis
- **Metadata**:
  - `lat` (number): Latitude
  - `lon` (number): Longitude
  - `point_index` (number): Index in selectedPoints array
  - `total_points` (number): Total number of points after addition
  - `compare_mode` (string): "points" | "months"

#### `point_removed`
- **Trigger**: User removes a point
- **Metadata**:
  - `point_index` (number): Index of removed point
  - `total_points` (number): Total number of points after removal

### Area Analysis

#### `area_added`
- **Trigger**: User adds an area (rectangle or field)
- **Metadata**:
  - `bounds` (array): Area bounds [[lat1, lon1], [lat2, lon2]]
  - `bounds_source` (string): "rectangle" | "field"
  - `area_index` (number): Index in selectedAreas array
  - `total_areas` (number): Total number of areas after addition
  - `compare_mode` (string): "areas" | "months"

#### `area_removed`
- **Trigger**: User removes an area
- **Metadata**:
  - `area_index` (number): Index of removed area
  - `total_areas` (number): Total number of areas after removal

#### `field_selection_started`
- **Trigger**: User clicks "parcel" link to start field selection
- **Metadata**:
  - `zoom` (number): Current zoom level
  - `bounds` (array): Current map bounds

#### `field_selection_cancelled`
- **Trigger**: User cancels field selection
- **Metadata**: None

#### `rectangle_drawing_started`
- **Trigger**: User clicks "rectangle" link to start drawing
- **Metadata**: None

#### `rectangle_drawing_cancelled`
- **Trigger**: User cancels rectangle drawing
- **Metadata**: None

### Time Selection

#### `month_changed`
- **Trigger**: User changes month via dropdown
- **Metadata**:
  - `previous_year` (number): Previous year
  - `previous_month` (number): Previous month (1-12)
  - `new_year` (number): New year
  - `new_month` (number): New month (1-12)
  - `analysis_mode` (string): Current analysis mode
  - `compare_mode` (string): Current compare mode

#### `month_added`
- **Trigger**: User adds month in months mode
- **Metadata**:
  - `year` (number): Year
  - `month` (number): Month (1-12)
  - `analysis_mode` (string): "point" | "area"
  - `total_months` (number): Total selected months after addition

#### `month_removed`
- **Trigger**: User removes month in months mode
- **Metadata**:
  - `year` (number): Year
  - `month` (number): Month (1-12)
  - `analysis_mode` (string): "point" | "area"
  - `total_months` (number): Total selected months after removal

### Chart Interactions

#### `chart_navigation_left`
- **Trigger**: User clicks left arrow to expand chart range backward
- **Debounce**: 1 second (matches existing debounce)
- **Metadata**:
  - `visible_range_start` (object): { year, month }
  - `visible_range_end` (object): { year, month }
  - `analysis_mode` (string): Current analysis mode
  - `compare_mode` (string): Current compare mode

#### `chart_navigation_right`
- **Trigger**: User clicks right arrow to expand chart range forward
- **Debounce**: 1 second (matches existing debounce)
- **Metadata**:
  - `visible_range_start` (object): { year, month }
  - `visible_range_end` (object): { year, month }
  - `analysis_mode` (string): Current analysis mode
  - `compare_mode` (string): Current compare mode

#### `y_axis_range_toggle`
- **Trigger**: User toggles Y-axis range (0-1 ↔ -1-1)
- **Metadata**:
  - `previous_range` (string): "0-1" | "-1-1"
  - `new_range` (string): "0-1" | "-1-1"
  - `analysis_mode` (string): Current analysis mode
  - `compare_mode` (string): Current compare mode

### Share & Export

#### `share_button_clicked`
- **Trigger**: User clicks Share button
- **Metadata**:
  - `analysis_mode` (string): Current analysis mode
  - `compare_mode` (string): Current compare mode
  - `has_points` (boolean): Whether points are selected
  - `has_areas` (boolean): Whether areas are selected

#### `share_url_copied`
- **Trigger**: User copies share URL
- **Metadata**:
  - `token` (string): Share token (optional, for correlation)

#### `share_link_opened`
- **Trigger**: User opens app via share link (URL parameter)
- **Metadata**:
  - `token` (string): Share token
  - `restored_state` (object): Summary of restored state (modes, counts, etc.)

#### `snapshot_modal_opened`
- **Trigger**: User opens snapshot comparison modal
- **Metadata**:
  - `snapshot_type` (string): "point" | "area"
  - `item_count` (number): Number of points/areas being compared

#### `snapshot_modal_closed`
- **Trigger**: User closes snapshot comparison modal
- **Metadata**:
  - `snapshot_type` (string): "point" | "area"

### Reset Actions

#### `reset_clicked`
- **Trigger**: User clicks Reset button
- **Metadata**:
  - `reset_type` (string): "full" | "point_selection" | "area_selection"
  - `analysis_mode` (string): Current analysis mode
  - `compare_mode` (string): Current compare mode

### Session Events

#### `session_started`
- **Trigger**: Page load / app initialization
- **Metadata**:
  - `user_agent` (string): Browser user agent
  - `screen_resolution` (string): Screen width x height
  - `referrer` (string): Referrer URL (if available)
  - `has_share_token` (boolean): Whether loaded from share link

#### `session_ended`
- **Trigger**: Page unload / beforeunload
- **Metadata**:
  - `session_duration` (number): Session duration in milliseconds
  - `total_events` (number): Total events tracked in session

## Implementation Details

### Analytics Hook (`useAnalytics`)
Create a custom hook that:
1. Manages in-memory event queue
2. Persists queue to sessionStorage
3. Batches and sends events periodically
4. Handles page unload
5. Provides `trackEvent(eventType, data)` function

### Event Tracking Pattern
```javascript
// Example usage (non-blocking)
trackEvent('point_added', {
  lat: 40.7128,
  lon: -74.0060,
  point_index: 0,
  total_points: 1
})
```

### API Route (`/api/analytics/log`)
- Accepts batch of events
- Uses existing `logAnalytics` function from `db.js`
- Returns success status
- Handles errors gracefully (never throws)

### Debouncing Strategy
- Map pan: 2 seconds debounce
- Map zoom: 1 second debounce
- Cloud tolerance: 1 second debounce (already implemented)
- Chart navigation: 1 second debounce (already implemented)

## Data Privacy & Security

1. **No PII**: Do not track personally identifiable information
2. **IP Address**: Not tracked (privacy-friendly)
3. **User Identification**: Anonymous sessions only
4. **Data Retention**: Configurable (default: keep all data)

## Admin Dashboard

### Authentication
- **Route**: `/admin` (protected)
- **Login Required**: All `/admin/*` routes require authentication
- **Credentials**: Hardcoded for now
  - Username: `admin`
  - Password: `admin`
- **Session**: Use session cookies or localStorage to maintain login state
- **Logout**: Logout button in dashboard header

### Dashboard Features

#### Admin Landing Page (`/admin`)
Single page showing all analytics options and data:

**Summary Statistics Cards** (top section):
- Total events tracked
- Events in last 24 hours
- Events in last 7 days
- Events in last 30 days
- Total sessions
- Average session duration

**Most Common Events** (middle section):
- Top 10 event types with counts
- Display as table or bar chart

**Recent Events Table** (middle section):
- Columns: Timestamp, Event Type, Data (formatted JSON)
- Show last 20-50 events
- Link to view all events

**Charts & Visualizations** (middle section):
- Event counts over time (line chart)
- Event type distribution (pie/bar chart)
- Most active hours of day (bar chart)
- Time range selector: Last 24h, 7d, 30d, custom range

**Filters & Actions** (top or sidebar):
- Event type filter dropdown
- Date range picker (start date, end date)
- Export buttons:
  - Export to CSV
  - Export to JSON
- Refresh button: Manual data refresh
- View All Events link: Navigate to full events list

**Full Events View** (expandable or separate section):
- Complete event list table
- Pagination: 50 events per page
- Sorting: By timestamp (newest first, default)
- All filters apply to this view

#### API Endpoints for Dashboard

##### `/api/admin/login`
- **Method**: POST
- **Body**: `{ username: string, password: string }`
- **Response**: `{ success: boolean, token?: string }`
- **Validation**: Check against hardcoded credentials

##### `/api/admin/analytics/summary`
- **Method**: GET
- **Query Params**: `?startDate=timestamp&endDate=timestamp` (optional)
- **Response**: `{ totalEvents, events24h, events7d, events30d, topEvents: Array, totalSessions, avgSessionDuration }`
- **Auth**: Requires admin session

##### `/api/admin/analytics/events`
- **Method**: GET
- **Query Params**: 
  - `?page=number` (default: 1)
  - `?limit=number` (default: 50)
  - `?eventType=string` (optional filter)
  - `?startDate=timestamp` (optional)
  - `?endDate=timestamp` (optional)
- **Response**: `{ events: Array, total: number, page: number, limit: number }`
- **Auth**: Requires admin session

##### `/api/admin/analytics/export`
- **Method**: GET
- **Query Params**: Same filters as events endpoint
  - `?format=csv|json`
  - `?eventType=string` (optional)
  - `?startDate=timestamp` (optional)
  - `?endDate=timestamp` (optional)
- **Response**: CSV file or JSON download
- **Auth**: Requires admin session

### Dashboard UI Requirements
- **Layout**: Clean, modern admin interface
- **Navigation**: Sidebar or top nav with links to Overview, Events, Analytics
- **Responsive**: Works on desktop and tablet
- **Loading States**: Show loading indicators during data fetch
- **Error Handling**: Display error messages gracefully

## Success Criteria

1. Zero performance impact on user interactions
2. All events tracked reliably (with local storage backup)
3. Analytics failures never affect app functionality
4. Events are batched efficiently (minimal API calls)
5. Database queries are optimized (indexed by timestamp)

