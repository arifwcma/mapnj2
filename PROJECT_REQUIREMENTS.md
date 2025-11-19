# Project Requirements Document

## Overview
NDVI analysis application with Point and Area analysis modes. Cloud tolerance slider persists across mode changes.

---

## Core Concepts

### Analysis Types
- **Point Analysis**: Analyze individual points on the map
- **Area Analysis**: Analyze areas (parcels or rectangles) on the map

**Behavior**: Selecting an analysis type resets all state except cloud coverage tolerance.

---

## Point Analysis

### Mode Selection
Below the Analysis dropdown, a radio button group: "Compare: (/) Points ( ) Months"
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
- **Directional message**: Always visible "Click to place a point"
- Clicking anywhere on map places a point

#### Info Panel (when one or more points selected)

**Month Dropdown**
- Label: "Select month"
- Options: Calendar months from current month back to January 2019
- Format: "2025 November", "2025 October", etc.
- Default: Current calendar month

**Table**
- Columns: "Marker", "Latitude", "Longitude", "NDVI (avg)", "Remove"
- NDVI (avg): Average NDVI of available images (within cloud tolerance) for the corresponding point for the last 6 months starting from the selected calendar month
- Format: 2-digit rounded
- Remove column: Cross button for each point
- Clicking cross removes the point from analysis
- Next added point takes first available color from color queue

**Chart**
- Shows last 6 months average NDVI for selected point(s) starting from selected calendar month
- Updates when month dropdown changes

**Navigation Arrows**
- Left and right arrows below chart
- Same logic as current implementation
- Clicking arrows updates table data
- Clicking right arrow updates month dropdown value
- **Critical**: Must prevent cyclic operation (ensure dropdown update doesn't trigger re-fetch that updates dropdown again)

**Empty State**: Info panel shows empty when no points selected

---

### Months Mode

#### Point Selection
- Can select only **one point**

#### Info Panel

**Month Selection Line**
- Calendar month dropdown (same format as Points mode)
- "Add" text-link beside dropdown
- **Behavior**: When point is first selected, current calendar month is automatically added to table/chart, and dropdown switches to previous calendar month (to avoid duplicate selection)
- Clicking "Add" adds data for selected calendar month (if not already added)

**Point Info Line**
- Displayed between month dropdown and chart
- Format: Blue icon (1) followed by "[lat] [lon]"
- Uses same blue icon as 1st point in Points mode

**Table**
- Columns: "Month", "NDVI (avg)", "Snapshot"
- Initially shows current calendar month only (auto-added on point selection)
- Snapshot column: Shows NDVI value as image thumbnail (same as Point-Points mode)
- Can remove months from list (remove functionality)
- Updates when months are added via "Add" button

**Chart**
- Initially shows current calendar month only (auto-added on point selection)
- Updates when months are added via "Add" button
- Shows only months that have been explicitly added

---

## Area Analysis

### Mode Selection
Similar to Point Analysis: "Compare: (/) Areas ( ) Months"
- **Areas** is the default selection

---

### Areas Mode (Default)

#### Area Selection
- Can select multiple areas (same logic as multiple points)
- **Color scheme**: Same as Points mode (1st blue, 2nd red, next 8 defined colors, then random)

**Control Panel Text**
- "Select area by choosing a parcel or drawing a rectangle"
- "parcel" and "rectangle" are clickable links
- Clicking "parcel" activates parcel selection mode
- Clicking "rectangle" activates rectangle drawing mode

#### Info Panel (when one or more areas selected)

**Month Dropdown**
- Same as Points mode

**Table**
- Columns: "Marker", "Latitude", "Longitude", "NDVI (avg)", "Snapshot", "Remove"
- NDVI (avg): Average NDVI for all pixels in the area (parcel or rectangle) for the selected calendar month (current month from dropdown)
- **Critical**: "avg" refers to averaging all pixels within the area for that month, NOT averaging across multiple months
- **Critical for parcels**: Only include pixels within the clipped area, NOT all pixels in the bounding box
- Snapshot column: Thumbnail of NDVI overlay for the corresponding month
- Clicking thumbnail opens larger image in closable pop-up
- Remove column: Cross button (same behavior as Points mode)

**Chart**
- Shows average NDVI for each month in x-axis (average of all pixels in the area for that month)
- Updates when month dropdown changes
- Same navigation arrow behavior as Points mode

**Navigation Arrows**
- Same behavior as Points mode

---

### Months Mode

**Pattern**: Follows same pattern as Point Analysis → Months Mode
- Select only one area
- Month dropdown with "Add" link
- Table and chart start with current calendar month
- Add months incrementally via "Add" button

---

## Technical Notes

### Color Management
- Maintain color queue for point/area assignment
- When point/area removed, color returns to queue
- Next added point/area takes first available color

### Data Calculation
- NDVI averages exclude null values
- 6-month window: Last 6 months starting from selected calendar month
- Cloud tolerance applies to all image filtering

### State Management
- Mode changes (Point/Area) reset all state except cloud tolerance
- Sub-mode changes (Points/Months or Areas/Months) maintain selected points/areas

