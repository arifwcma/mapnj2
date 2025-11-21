# Project Requirements Document

## Overview
NDVI analysis application with Point and Area analysis modes. Cloud tolerance dropdown persists across mode changes. Supports comparing multiple points/areas or exploring single point/area across multiple months.

---

## Core Concepts

### Analysis Types
- **Point Analysis**: Analyze individual points on the map
- **Area Analysis**: Analyze areas (parcels or rectangles) on the map

**Behavior**: Selecting an analysis type resets all state except cloud coverage tolerance.

### Compare Modes
- **Points/Areas Mode**: Compare multiple points/areas across time
- **Months Mode**: Explore single point/area across multiple months

---

## Point Analysis

### Mode Selection
Below the Analysis dropdown, a dropdown selector: "Compare: Points / Months"
- **Points** is the default selection

---

### Points Mode (Default)

#### Point Selection
- Can select indefinite number of points
- All points follow the same logic (no special handling for 1st, 2nd, etc.)
- **Color scheme**:
  - 1st point: Blue
  - 2nd point: Red
  - Next 8 points: Defined color map
  - After 10 points: Randomly generated colors
- **Marker**: Small upside-down triangle (drawn on the fly) in corresponding color based on serial order
- **Directional message**: Always visible "Click to place a point" when no points selected
- Clicking anywhere on map places a point
- NDVI overlay loads for selected points using small bbox around each point (not full viewport)

#### Info Panel (when one or more points selected)

**Month Dropdown**
- Label: "Select month"
- Options: Calendar months from current month back to January 2001
- Format: "2025 November", "2025 October", etc.
- Default: Current calendar month

**Compare Snapshots Button**
- Text link: "Compare snapshots"
- Visible when at least 1 point is selected
- Opens popup showing comparison table of all selected points across months in visible range
- Table shows months as rows, points as columns
- Column headers show numbered marker icons (1), (2), etc.
- Each cell shows point snapshot (colored circle) or "No data"

**Table**
- Columns: "Marker", "Latitude", "Longitude", "NDVI (avg)", "Remove"
- NDVI (avg): Average NDVI of available images (within cloud tolerance) for the corresponding point for the visible range
- Format: 2-digit rounded
- Remove column: Cross button for each point
- Clicking cross removes the point from analysis
- Next added point takes first available color from color queue

**Chart**
- Shows average NDVI for selected point(s) for visible range
- Updates when month dropdown changes
- **Default visible range**: When a month is selected via the month dropdown, the chart displays all 12 months of that calendar year (January through December)
- **Example**: Selecting "May 2022" shows data from January 2022 to December 2022 by default
- Y-axis range toggle: Button (↓/↑) toggles between 0-1 and -1 to +1 range
- Default y-axis range: 0-1
- Chart navigation arrows: Left/right arrows below chart
- Arrow behavior: Adds months to visible range (expands), doesn't shift
- Left limit: January 2001
- Right limit: Current calendar month
- Debouncing: 1 second delay for arrow clicks

**NDVI Legend**
- Position: Below chart navigation arrows
- Format: Horizontal continuous color gradient bar
- Range: Always -1 to +1 (regardless of chart y-axis range)
- Color scheme: Matches GEE visualization (darkred → orangered → red → yellow → darkgreen)
- Tick values: -1, -0.5, 0, 0.5, 1.0
- Label: "NDVI Value" below ticks

**Empty State**: Info panel shows empty when no points selected

---

### Months Mode

#### Point Selection
- Can select only **one point**
- **Marker**: Circle icon with number (1) inside, not default map pin
- **Reset Button**: Text link in control panel (left side) when point is selected
- Clicking reset clears selected point and returns to default state
- When point is selected, "Click to select a point" message is hidden
- Clicking on map does NOT set new point when one is already selected

#### Info Panel

**Month Selection Line**
- Calendar month dropdown (same format as Points mode)
- "Add" button beside dropdown
- **Behavior**: When point is first selected, NO month is auto-added
- User must manually add months via "Add" button
- Dropdown excludes months already in the table
- When a month is removed from table, it becomes available in dropdown again
- Clicking "Add" adds data for selected calendar month (if not already added)

**Point Info Line**
- Displayed between month dropdown and table
- Format: Circle marker icon (1) followed by "Point 1"
- Coordinates displayed below: "Lat: [lat], Lon: [lon]"
- Uses same blue color as 1st point in Points mode

**Table**
- Columns: "Month", "NDVI (avg)", "Snapshot", "Remove"
- NDVI (avg): Average NDVI for the point for that specific month
- Format: 2-digit rounded or "N/A" if null
- Snapshot column: Shows NDVI value as colored circle (PointSnapshot component)
- Can remove months from list (remove functionality)
- Updates when months are added via "Add" button

**Chart**
- Shows NDVI for selected months only (no auto-add)
- Updates when months are added via "Add" button
- Y-axis range toggle: Button (↓/↑) toggles between 0-1 and -1 to +1 range
- Default y-axis range: 0-1
- Chart navigation: No arrows (only shows selected months)

**NDVI Legend**
- Position: Below chart (if chart is visible)
- Same format and behavior as Points mode

---

## Area Analysis

### Mode Selection
Similar to Point Analysis: "Compare: Areas / Months"
- **Areas** is the default selection

---

### Areas Mode (Default)

#### Area Selection
- Can select multiple areas (same logic as multiple points)
- **Color scheme**: Same as Points mode (1st blue, 2nd red, next 8 defined colors, then random)
- **Area Markers**: Numbered marker icons (1), (2), etc. displayed at center of each selected area
- Markers are visual indicators only (not draggable or clickable)
- Both parcel and rectangle selections treated identically (same structure in selectedAreas)

**Control Panel Text**
- "Select area by choosing a parcel or drawing a rectangle"
- "parcel" and "rectangle" are clickable links
- Clicking "parcel" activates parcel selection mode
- Clicking "rectangle" activates rectangle drawing mode
- **Selection Mode UI**: When in selection mode (drawing or parcel selection):
  - Main text disappears
  - Message box appears with contextual guidance:
    - "Click and drag to draw a rectangle" when drawing
    - "Click the desired parcel" when zoom sufficient
    - "Zoom further to view parcels" when zoom insufficient
    - "Loading parcel data..." when loading (blinking red text)
  - "Cancel" text link appears below message box
  - Clicking cancel returns to default mode

**NDVI Overlays**
- Each selected area displays its own NDVI overlay simultaneously
- Overlays persist when new area is being selected
- Overlays load based on selected month/year and cloud tolerance

#### Info Panel (when one or more areas selected)

**Month Dropdown**
- Same as Points mode

**Compare Snapshots Button**
- Text link: "Compare snapshots"
- Visible when at least 1 area is selected
- Opens popup showing comparison table of all selected areas across months in visible range
- Table shows months as rows, areas as columns
- Column headers show numbered marker icons (1), (2), etc.
- Each cell shows area snapshot thumbnail or "No data"
- Table is borderless

**Table**
- Columns: "Marker", "Latitude", "Longitude", "NDVI (avg)", "Snapshot", "Remove"
- Borderless styling
- NDVI (avg): Average NDVI for all pixels in the area (parcel or rectangle) for the selected calendar month
- **Critical**: "avg" refers to averaging all pixels within the area for that month, NOT averaging across multiple months
- **Critical for parcels**: Only include pixels within the clipped area, NOT all pixels in the bounding box
- Snapshot column: Thumbnail of NDVI overlay for the corresponding month
- Clicking thumbnail opens larger image in closable popup (AreaSnapshot component)
- Remove column: Cross button (same behavior as Points mode)

**Chart**
- Shows average NDVI for each month in x-axis (average of all pixels in the area for that month)
- Updates when month dropdown changes
- **Default visible range**: When a month is selected via the month dropdown, the chart displays all 12 months of that calendar year (January through December)
- **Example**: Selecting "May 2022" shows data from January 2022 to December 2022 by default
- Y-axis range toggle: Button (↓/↑) toggles between 0-1 and -1 to +1 range
- Default y-axis range: 0-1
- Chart navigation arrows: Left/right arrows below chart
- Arrow behavior: Adds months to visible range (expands), doesn't shift
- Left limit: January 2001
- Right limit: Current calendar month
- Debouncing: 1 second delay for arrow clicks

**NDVI Legend**
- Position: Below chart navigation arrows
- Same format and behavior as Points mode

---

### Months Mode

**Pattern**: Follows same pattern as Point Analysis → Months Mode

#### Area Selection
- Can select only **one area**
- **Area Markers**: Numbered marker icon (1) displayed at center of selected area
- **Reset Selection**: Text link appears at top of control panel when area is selected
- Clicking reset clears selected area and returns to default state
- When area is selected, "Select area by choosing a parcel or drawing a rectangle" prompt disappears
- Selection mode UI same as Areas mode (with cancel button)

**Control Panel Text**
- "Select area by choosing a parcel or drawing a rectangle" visible when no area selected
- When selection starts (clicking parcel or rectangle), main text disappears, cancel button appears
- After area is selected, prompt disappears completely

#### Info Panel

**Month Selection Line**
- Calendar month dropdown (same format as Areas mode)
- "Add" button beside dropdown
- **Behavior**: When area is first selected, NO month is auto-added
- User must manually add months via "Add" button
- Dropdown excludes months already in the table
- When a month is removed from table, it becomes available in dropdown again
- Clicking "Add" adds data for selected calendar month (if not already added)

**Area Info Line**
- Displayed between month dropdown and table
- Format: Triangle marker icon (1) followed by "Area 1"
- Coordinates displayed below: "Lat: [lat], Lon: [lon]" (center of area)
- Uses same blue color as 1st area in Areas mode

**Compare Snapshots Button**
- Text link: "Compare snapshots"
- Visible when at least 1 month is selected
- Opens popup showing comparison table for the selected area across selected months only
- Only lists images for months available in current table/chart
- Same format as Areas mode comparison popup

**Table**
- Columns: "Month", "NDVI (avg)", "Snapshot", "Remove"
- NDVI (avg): Average NDVI for all pixels in the area for that specific month
- Format: 2-digit rounded or "N/A" if null
- Snapshot column: Shows area snapshot thumbnail (AreaSnapshot component)
- Can remove months from list (remove functionality)
- Updates when months are added via "Add" button

**Chart**
- Shows NDVI for selected months only (no auto-add)
- Updates when months are added via "Add" button
- Y-axis range toggle: Button (↓/↑) toggles between 0-1 and -1 to +1 range
- Default y-axis range: 0-1
- Chart navigation: No arrows (only shows selected months)

**NDVI Legend**
- Position: Below chart (if chart is visible)
- Same format and behavior as Points mode

---

## Cloud Tolerance Control

### Implementation
- **Control Type**: Dropdown selector (0-100)
- **Label**: "Cloud tolerance (%):" (left-aligned)
- **Values**: 0 to 100 (inclusive)
- **Debouncing**: 1 second delay before triggering API calls
- **Persistence**: Value persists across mode changes

### Behavior
- Changing dropdown value updates UI immediately
- API calls triggered after 1 second of no changes
- If multiple rapid changes occur, only the last value triggers API call after 1 second delay
- **Note**: Cloud tolerance only applies to Sentinel-2 data (dates >= January 2019). MODIS data (dates < January 2019) uses SummaryQA=0 filtering and ignores cloud tolerance.

---

## UI/UX Details

### Loading Messages
- All loading/progress messages use blinking animation (0.8s cycle)
- Loading text color: Red (#dc2626)
- Examples: "Loading data...", "Loading parcel data...", "Reloading..."

### Chart Navigation
- **Arrow Style**: White background, border, rounded corners, specific padding/font size
- **Behavior**: Add months to visible range (expand), not shift
- **Debouncing**: 1 second delay for arrow clicks
- **Limits**: Left = Jan 2001, Right = current calendar month

### Y-Axis Range Toggle
- **Button**: Shows ↓ when range is 0-1, shows ↑ when range is -1 to +1
- **Position**: Center button between left/right arrows (or centered if no arrows)
- **Style**: Same as arrow buttons
- **Default**: 0-1 range

### NDVI Legend
- **Position**: Below chart navigation arrows (or below chart if no arrows)
- **Range**: Always -1 to +1 (independent of chart y-axis range)
- **Format**: Continuous horizontal gradient bar
- **Color Scheme**: Matches GEE visualization parameters
- **Ticks**: -1, -0.5, 0, 0.5, 1.0

### Compare Snapshots Popup
- **Draggable**: Can be dragged around screen
- **Table**: Sticky header (dates) and first column (points/areas)
- **Headers**: Show numbered marker icons instead of text labels
- **Styling**: Borderless table
- **Loading**: Shows blinking red "Loading..." text

---

## Technical Notes

### Color Management
- Maintain color queue for point/area assignment
- When point/area removed, color returns to queue
- Next added point/area takes first available color
- Color utilities: `getColorForIndex()` function

### Data Calculation
- NDVI averages exclude null values
- Cloud tolerance applies only to Sentinel-2 image filtering (dates >= January 2019)
- Point NDVI fetching: Uses small bbox (0.01° buffer ≈ 1km) around point, not full viewport
- Area NDVI fetching: Uses area bounds (with geometry clipping for parcels)
- **Initial visible range**: For Point-Points and Area-Areas modes, the initial visible range spans the full calendar year (12 months) of the selected month, from January to December of that year

### Dual Data Source Logic
- **Date Range**: Earliest date is January 2001
- **Sentinel-2**: Used for dates >= January 2019
  - Collection: COPERNICUS/S2_SR_HARMONIZED
  - NDVI calculation: normalizedDifference(["B8", "B4"])
  - Cloud filtering: Uses CLOUDY_PIXEL_PERCENTAGE based on cloud tolerance setting
  - Spatial resolution: 10m
- **MODIS**: Used for dates < January 2019
  - Collection: MODIS/061/MOD13Q1
  - NDVI band: Pre-calculated NDVI band (multiply by 0.0001 for scaling)
  - Quality filtering: SummaryQA = 0 (always, ignores cloud tolerance)
  - Spatial resolution: 250m (16-day composite)
- **Automatic Routing**: System automatically selects data source based on query start date
- **RGB Tiles**: Only available for Sentinel-2 (no MODIS RGB equivalent)

### State Management
- Mode changes (Point/Area) reset all state except cloud tolerance
- Sub-mode changes (Points/Months or Areas/Months) maintain selected points/areas
- Uses React hooks: useState, useCallback, useEffect, useRef
- Debouncing implemented with useRef and setTimeout

### API Endpoints
- `/api/ndvi/point/month`: Fetch NDVI for point for specific month (no bbox required)
- `/api/ndvi/point`: Fetch NDVI for point for date range (no bbox required)
- `/api/ndvi/area/month`: Fetch average NDVI for area for specific month
- `/api/ndvi/average`: Fetch NDVI tile/thumbnail for area (POST for geometry, GET for bounds)
- `/api/count_available`: Count available images for date range
- `/api/find_month`: Find most recent month with available images

### Earth Engine Processing
- **Sentinel-2 (dates >= January 2019)**:
  - Image collection: COPERNICUS/S2_SR_HARMONIZED
  - NDVI calculation: normalizedDifference(["B8", "B4"])
  - Cloud filtering: CLOUDY_PIXEL_PERCENTAGE based on cloud tolerance
- **MODIS (dates < January 2019)**:
  - Image collection: MODIS/061/MOD13Q1
  - NDVI: Pre-calculated NDVI band multiplied by 0.0001
  - Quality filtering: SummaryQA = 0 (ignores cloud tolerance)
- For rectangle overlays: 20% buffer for filtering, clipped to original bounds
- For parcel overlays: Filtered by bounds, clipped to exact parcel geometry
- Empty collection check: Throws "No images found" error if no images available
- Tile generation: Uses mosaic() for full coverage, sorted by time (most recent first)

### Component Structure
- Modular design with separate components for each feature
- Reusable components: TriangleMarker, AreaSnapshot, PointSnapshot, MonthDropdown, NdviLegend
- Hooks: usePointDataMap, useAreaDataMap, useRequestTracker, useToast, useNullDataDetection
- No comments in code (as per project style)

### Code Style
- Use absolute imports with @/ alias
- TypeScript/JavaScript mix (page.tsx is .tsx, components are .jsx)
- Tailwind CSS for styling (replaced inline styles for loading messages)
- No comments in code
- Follow React best practices: hooks, useCallback, useRef for performance
