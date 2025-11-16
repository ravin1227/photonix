# Photonix Mobile App - UX Wireframe Specification

## Document Overview

This document provides a complete UX wireframe specification for Photonix, a self-hosted, AI-powered personal photo gallery mobile application. The specification focuses on screen architecture, user flows, and interaction patterns without visual design details.

**Design Philosophy:**
- Modern, minimalistic, clean UI
- Soft rounded cards, large thumbnails
- Bottom navigation bar for primary actions
- One-hand optimized interactions
- Light + dark mode compatible structure
- Intuitive gestures and 2025-level UX standards

---

## 1. Complete Screen Inventory

### Primary Navigation Screens
1. **Onboarding Flow**
   - Welcome Screen
   - Server Connection Screen
   - QR Code Scanner Screen
   - Login Screen
   - Permissions Request Screen

2. **Home Gallery Screen**
   - Timeline View (default)
   - Filter Tabs (Recent, People, Albums)

3. **Photo Viewer Screen**
   - Full Photo View
   - Photo Info Bottom Sheet

4. **Albums Screen**
   - Albums List View
   - Album Detail View
   - Create Album Flow

5. **People Screen**
   - Face Groups Grid
   - Individual Person View
   - Person Edit Screen

6. **Search Screen**
   - Search Input & Results
   - Filter Panel

7. **Upload Flow**
   - Photo Selection Screen
   - Upload Progress Screen
   - Upload Success/Error States

8. **Settings Screen**
   - Settings List
   - Account Details
   - Server Connection Settings
   - Privacy & Cache Settings

### Secondary/Modal Screens
9. **Photo Info Panel** (Bottom Sheet)
10. **Share Sheet** (Native)
11. **Delete Confirmation** (Dialog)
12. **Error States** (Various contexts)
13. **Empty States** (Various contexts)

---

## 2. Detailed Screen Wireframes

### 2.1 Onboarding Flow

#### Screen 1.1: Welcome Screen
**Layout Structure:**
- **Top Section:** Status bar (system)
- **Center Section:** 
  - Large app icon placeholder (centered, ~120x120dp)
  - App name "Photonix" (large, bold, centered, ~32sp)
  - Tagline "Your private photo gallery" (centered, ~16sp, secondary text)
- **Bottom Section:**
  - Primary button: "Get Started" (full-width, rounded, ~56dp height, ~16dp margin)
  - Secondary text: "Already have an account? Sign in" (centered, ~14sp, tappable)

**Interaction Notes:**
- Tap "Get Started" → Navigate to Server Connection Screen
- Tap "Sign in" → Navigate to Login Screen (skip onboarding)

---

#### Screen 1.2: Server Connection Screen
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left, ~24dp)
  - Title "Connect to Server" (center, ~20sp)
  - Skip button (right, ~14sp, optional for advanced users)
- **Main Content Area:**
  - Illustration placeholder (centered, ~200dp height)
  - Heading "Find your server" (~24sp, bold, centered)
  - Description text (~16sp, centered, ~2-3 lines)
  - **Connection Methods:**
    - Primary button: "Scan QR Code" (full-width, rounded, icon + text)
    - Secondary button: "Enter Server Address" (full-width, outlined, icon + text)
    - Tertiary option: "Auto-discover on network" (text link, ~14sp)
- **Bottom Section:**
  - Help text: "Make sure you're on the same network" (~12sp, centered, secondary)

**Interaction Notes:**
- Tap "Scan QR Code" → Open QR Scanner Screen
- Tap "Enter Server Address" → Show input field overlay or navigate to manual entry
- Tap "Auto-discover" → Show loading state, then list of discovered servers
- Back arrow → Return to Welcome Screen

---

#### Screen 1.3: QR Code Scanner Screen
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "Scan QR Code" (center)
- **Main Content Area:**
  - Camera viewfinder (full-screen, centered)
  - Overlay frame (square, centered, ~300x300dp, with corner guides)
  - Instruction text: "Position QR code within frame" (below frame, centered, ~14sp)
- **Bottom Section:**
  - Cancel button (full-width, secondary style)

**Interaction Notes:**
- Successful scan → Auto-navigate to Login Screen with pre-filled server address
- Failed scan → Show error message, continue scanning
- Cancel → Return to Server Connection Screen

---

#### Screen 1.4: Login Screen
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "Sign In" (center)
- **Main Content Area:**
  - Server address display (read-only, ~16sp, with edit icon)
  - **Input Fields (stacked, ~16dp spacing):**
    - Username field (rounded, ~56dp height, icon on left, placeholder "Enter username")
    - Password field (rounded, ~56dp height, icon on left, show/hide toggle on right)
  - "Forgot password?" link (right-aligned, ~14sp, below password field)
- **Action Buttons:**
  - Primary button: "Sign In" (full-width, rounded, ~56dp height, ~16dp margin)
  - Secondary button: "Scan QR Code" (full-width, outlined, icon + text)
- **Bottom Section:**
  - Help text: "Need help connecting?" (centered, ~14sp, tappable)

**Interaction Notes:**
- Tap server address → Return to Server Connection Screen
- Tap "Sign In" → Validate credentials, show loading, navigate to Permissions Screen on success
- Tap "Forgot password?" → Show recovery flow (if implemented)
- Tap "Scan QR Code" → Open QR Scanner
- Validation errors → Show inline error messages below fields

---

#### Screen 1.5: Permissions Request Screen
**Layout Structure:**
- **Top Section:**
  - Illustration placeholder (~150dp height, centered)
  - Heading "Enable Permissions" (~24sp, bold, centered)
  - Description (~16sp, centered, ~3-4 lines explaining why permissions are needed)
- **Permission Cards (stacked, ~12dp spacing):**
  - **Photos Access Card:**
    - Icon (left, ~48dp)
    - Title "Photo Library Access" (~18sp, bold)
    - Description (~14sp, secondary)
    - Toggle/Button "Enable" (right)
  - **Local Network Card:**
    - Icon (left, ~48dp)
    - Title "Local Network Discovery" (~18sp, bold)
    - Description (~14sp, secondary)
    - Toggle/Button "Enable" (right)
- **Bottom Section:**
  - Primary button: "Continue" (full-width, rounded, ~56dp height)
  - Secondary text: "Skip for now" (centered, ~14sp, tappable)

**Interaction Notes:**
- Tap "Enable" on permission cards → Open system permission dialogs
- Tap "Continue" → Navigate to Home Gallery Screen
- Tap "Skip" → Navigate to Home Gallery Screen (with limited functionality)
- System permission denied → Show guidance message, allow retry

---

### 2.2 Home Gallery Screen

#### Screen 2.1: Timeline View (Default)
**Layout Structure:**
- **Top Navigation Bar:**
  - App logo/name "Photonix" (left, ~20sp, bold)
  - Search icon (right, ~24dp, tappable)
  - Profile/Account icon (right, ~24dp, tappable, ~8dp spacing from search)
- **Filter Tabs (horizontal scrollable, below nav bar):**
  - Tab chips: "Recent" (selected), "People", "Albums" (~12dp spacing)
  - Selected tab: bold, underline indicator
- **Main Content Area (infinite scroll grid):**
  - **Date Headers:**
    - Sticky date label (e.g., "Nov 12, 2025", ~16sp, bold, ~16dp padding)
  - **Photo Grid:**
    - 3-column grid layout
    - Square thumbnails (aspect ratio 1:1)
    - ~2dp spacing between items
    - Rounded corners (~8dp radius)
    - Each thumbnail shows:
      - Image placeholder
      - Optional: small badge overlay (favorite icon, video indicator, etc.)
- **Floating Action Button (FAB):**
  - Circular button (~56dp diameter)
  - Plus icon (white, centered)
  - Position: bottom-right, ~16dp from edges
  - Elevation: ~8dp shadow

**Interaction Notes:**
- Scroll down → Load more photos (infinite scroll)
- Tap photo → Open Photo Viewer Screen
- Long press photo → Show context menu (Favorite, Share, Delete, Info)
- Tap date header → Scroll to that date section
- Tap filter tabs → Switch between Recent/People/Albums views
- Tap search icon → Navigate to Search Screen
- Tap profile icon → Navigate to Settings Screen
- Tap FAB → Open Upload Flow
- Pull to refresh → Reload photos from server

---

#### Screen 2.2: People Filter View
**Layout Structure:**
- **Top Navigation Bar:** Same as Timeline View
- **Filter Tabs:** Same as Timeline View (People selected)
- **Main Content Area:**
  - Grid of face thumbnails (3-column, same as photo grid)
  - Each face card shows:
    - Circular face thumbnail (~80dp diameter)
    - Person name below (or "Unknown" if unnamed, ~14sp)
    - Photo count badge (e.g., "1,234 photos", ~12sp, secondary)
  - "Add Person" card (last item, with plus icon)

**Interaction Notes:**
- Tap face card → Navigate to Individual Person View
- Tap "Add Person" → Open person creation flow
- Long press face card → Show menu (Edit name, Merge, Hide)

---

#### Screen 2.3: Albums Filter View
**Layout Structure:**
- **Top Navigation Bar:** Same as Timeline View
- **Filter Tabs:** Same as Timeline View (Albums selected)
- **Main Content Area:**
  - List of album cards (vertical scroll)
  - Each album card:
    - Cover image (left, ~80x80dp, rounded ~8dp)
    - Album name (left of image, ~18sp, bold)
    - Photo count (below name, ~14sp, secondary)
    - Chevron icon (right, ~24dp)
  - "Create Album" card (first item, with plus icon, outlined style)

**Interaction Notes:**
- Tap album card → Navigate to Album Detail View
- Tap "Create Album" → Open Create Album Flow
- Swipe left on album → Show delete option (optional)

---

### 2.3 Photo Viewer Screen

#### Screen 3.1: Full Photo View
**Layout Structure:**
- **Full-screen image display:**
  - Image fills screen (maintains aspect ratio, centered)
  - Pinch to zoom enabled
  - Double-tap to zoom
- **Top Overlay Bar (hidden by default, appears on tap):**
  - Back arrow (left, ~24dp, white/contrast color)
  - Photo title/filename (center, ~16sp, truncated)
  - More options menu (right, 3-dot icon, ~24dp)
- **Bottom Overlay Bar (hidden by default, appears on tap):**
  - Action buttons (horizontal row, ~56dp height):
    - Favorite icon (left, ~24dp, toggle state)
    - Info icon (center-left, ~24dp)
    - Share icon (center-right, ~24dp)
    - Delete icon (right, ~24dp, destructive color)
  - Photo counter: "3 of 150" (centered, above buttons, ~12sp)

**Interaction Notes:**
- Tap image → Toggle UI overlay visibility
- Swipe left → Navigate to next photo
- Swipe right → Navigate to previous photo
- Swipe down → Dismiss viewer, return to gallery
- Pinch/spread → Zoom in/out
- Double-tap → Zoom to 2x or reset
- Long press → Show share menu
- Tap back arrow → Return to gallery
- Tap favorite → Toggle favorite state (with animation)
- Tap info → Open Photo Info Bottom Sheet
- Tap share → Open native share sheet
- Tap delete → Show confirmation dialog
- Tap more options → Show action sheet (Set as cover, Add to album, etc.)

---

#### Screen 3.2: Photo Info Bottom Sheet
**Layout Structure:**
- **Bottom Sheet (slides up from bottom, ~60% screen height):**
  - Drag handle (top center, ~4dp height, ~40dp width, rounded)
  - **Content Sections (scrollable, ~16dp padding):**
    - **Thumbnail Preview:**
      - Small photo thumbnail (~80x80dp, rounded, centered)
    - **People Section:**
      - Section header "People" (~16sp, bold)
      - Horizontal scrollable chips:
        - Face thumbnails (circular, ~48dp) with names
        - "+ Add" chip (outlined, ~48dp)
    - **Details Section:**
      - Section header "Details" (~16sp, bold)
      - Detail rows (2-column grid):
        - Date/Time (icon + text)
        - Camera model (icon + text)
        - Location (icon + text)
        - Resolution (icon + text)
        - EXIF data (icon + text, expandable)
        - Filename (icon + text)
    - **Location Section:**
      - Section header "Location" (~16sp, bold)
      - Map placeholder (~200dp height, rounded, centered)
      - Address text (below map, ~14sp, secondary)

**Interaction Notes:**
- Swipe down on sheet → Dismiss bottom sheet
- Tap drag handle → Dismiss bottom sheet
- Tap face chip → Navigate to Individual Person View
- Tap "+ Add" → Open person tagging flow
- Tap EXIF row → Expand/collapse detailed EXIF data
- Tap location → Open map view (if implemented)
- Tap outside sheet → Dismiss bottom sheet

---

### 2.4 Albums Screen

#### Screen 4.1: Albums List View
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "Albums" (center)
  - Search icon (right, optional)
- **Main Content Area:**
  - **Auto Albums Section:**
    - Section header "Auto Albums" (~18sp, bold, ~16dp padding)
    - Grid of album cards (2-column, ~8dp spacing):
      - Cover image (full-width, ~120dp height, rounded top)
      - Album name (below image, ~16sp, bold, ~8dp padding)
      - Photo count (below name, ~14sp, secondary)
  - **My Albums Section:**
    - Section header "My Albums" (~18sp, bold, ~16dp padding)
    - Same grid layout as Auto Albums
    - "Create Album" card (first item, outlined style, with plus icon)

**Interaction Notes:**
- Tap album card → Navigate to Album Detail View
- Tap "Create Album" → Open Create Album Flow
- Long press album → Show menu (Edit, Delete, Share)
- Pull to refresh → Reload albums

---

#### Screen 4.2: Album Detail View
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Album name (center, truncated)
  - More options menu (right, 3-dot icon)
- **Album Header:**
  - Cover image (full-width, ~200dp height)
  - Album metadata overlay (bottom of cover):
    - Photo count (~16sp, bold, white)
    - Date range (~14sp, secondary, white)
- **Main Content Area:**
  - Photo grid (3-column, same as Home Gallery)
  - Empty state if no photos (centered illustration + "Add photos" button)

**Interaction Notes:**
- Tap photo → Open Photo Viewer Screen (within album context)
- Swipe between photos → Navigate through album photos
- Long press photo → Show menu (Remove from album, etc.)
- Tap more options → Show menu (Edit album, Delete album, Share album)
- Pull to refresh → Reload album photos

---

#### Screen 4.3: Create Album Flow
**Layout Structure:**
- **Top Navigation Bar:**
  - Cancel button (left)
  - Title "New Album" (center)
  - Create button (right, disabled until name entered)
- **Main Content Area:**
  - Album name input field (full-width, rounded, ~56dp height, ~16dp margin)
  - Placeholder: "Album name"
  - **Photo Selection Section:**
    - Section header "Add Photos" (~18sp, bold)
    - Photo grid (3-column, same as gallery)
    - Selected photos show checkmark overlay
    - Counter: "X photos selected" (below grid, ~14sp, centered)

**Interaction Notes:**
- Type album name → Enable "Create" button
- Tap photo → Toggle selection (checkmark appears)
- Tap "Create" → Create album, show success, navigate to Album Detail View
- Tap "Cancel" → Show discard confirmation if changes made
- Multi-select enabled by default

---

### 2.5 People Screen

#### Screen 5.1: Face Groups Grid
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "People" (center)
  - Search icon (right, optional)
- **Main Content Area:**
  - Grid of face cards (3-column, same as photo grid)
  - Each face card:
    - Circular face thumbnail (~100dp diameter)
    - Person name (below, ~16sp, bold, centered)
    - Photo count (below name, ~14sp, secondary)
  - "Unknown" section (if applicable):
    - Section header "Unknown Faces" (~18sp, bold)
    - Same grid layout
    - Unnamed faces show "Unknown" label

**Interaction Notes:**
- Tap face card → Navigate to Individual Person View
- Long press face card → Show menu (Edit name, Merge, Hide person)
- Tap search → Filter people by name

---

#### Screen 5.2: Individual Person View
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Person name (center, editable)
  - Edit icon (right, ~24dp)
- **Person Header:**
  - Large face thumbnail (centered, ~120dp diameter, circular)
  - Person name (below thumbnail, ~24sp, bold, centered)
  - Photo count (below name, ~16sp, secondary)
  - Action buttons (horizontal row, ~16dp spacing):
    - "Add Photos" button (outlined)
    - "Merge" button (outlined)
- **Main Content Area:**
  - Photo grid (3-column, same as Home Gallery)
  - All photos of this person

**Interaction Notes:**
- Tap edit icon → Open Person Edit Screen
- Tap photo → Open Photo Viewer Screen (filtered to this person)
- Tap "Add Photos" → Open photo selection, add faces to this person
- Tap "Merge" → Open person selection, merge with another person
- Long press photo → Show menu (Remove from person, etc.)

---

#### Screen 5.3: Person Edit Screen
**Layout Structure:**
- **Top Navigation Bar:**
  - Cancel button (left)
  - Title "Edit Person" (center)
  - Save button (right)
- **Main Content Area:**
  - Face thumbnail (centered, ~120dp diameter, circular)
  - Name input field (full-width, rounded, ~56dp height, ~16dp margin)
  - **Actions Section:**
    - "Merge with another person" (row, with chevron)
    - "Hide person" (row, destructive color)
    - "Delete person" (row, destructive color, at bottom)

**Interaction Notes:**
- Edit name → Update person name
- Tap "Merge" → Open person selection dialog
- Tap "Hide" → Confirm, hide person from main view
- Tap "Delete" → Show confirmation, delete person grouping
- Tap "Save" → Save changes, return to Individual Person View
- Tap "Cancel" → Discard changes, return to Individual Person View

---

### 2.6 Search Screen

#### Screen 6.1: Search Input & Results
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Search input field (center, full-width, rounded, ~40dp height)
    - Search icon (left, inside field)
    - Placeholder: "Search photos, people, places..."
    - Clear button (right, inside field, appears when typing)
  - Cancel button (right, appears when focused)
- **Main Content Area:**
  - **When Empty/No Query:**
    - Recent searches section (if any)
    - Suggestions section:
      - "People" chips (horizontal scroll)
      - "Places" chips (horizontal scroll)
      - "Objects" chips (horizontal scroll)
      - "Dates" quick filters (horizontal scroll)
  - **When Searching:**
    - Results grouped by type:
      - "People" section (face thumbnails, horizontal scroll)
      - "Photos" section (grid, 3-column)
      - "Albums" section (list)
      - "Places" section (list with map thumbnails)

**Interaction Notes:**
- Tap search field → Focus, show keyboard
- Type query → Show real-time results
- Tap suggestion chip → Apply filter, show results
- Tap result → Navigate to relevant screen
- Tap clear → Clear search, show suggestions
- Tap cancel → Dismiss search, return to previous screen
- Swipe down → Dismiss keyboard

---

#### Screen 6.2: Filter Panel
**Layout Structure:**
- **Bottom Sheet (slides up, ~40% screen height):**
  - Drag handle (top center)
  - Title "Filters" (~20sp, bold, ~16dp padding)
  - **Filter Sections (scrollable):**
    - **File Type:**
      - Checkboxes: Photos, Videos, RAW
    - **Camera Model:**
      - Text input or dropdown
    - **Date Range:**
      - Start date picker
      - End date picker
    - **Tags:**
      - Tag chips (multi-select)
    - **Location:**
      - Location input or map picker
  - **Action Buttons:**
    - "Clear All" button (left, outlined)
    - "Apply" button (right, primary)

**Interaction Notes:**
- Swipe down → Dismiss filter panel
- Select filters → Update "Apply" button state
- Tap "Apply" → Apply filters, update search results
- Tap "Clear All" → Reset all filters

---

### 2.7 Upload Flow

#### Screen 7.1: Photo Selection Screen
**Layout Structure:**
- **Top Navigation Bar:**
  - Cancel button (left)
  - Title "Select Photos" (center)
  - Next button (right, disabled until selection made)
- **Main Content Area:**
  - Device photo grid (3-column, same as gallery)
  - Selected photos show:
    - Checkmark overlay (top-right corner)
    - Dimmed background
  - Selection counter: "X selected" (bottom bar, ~56dp height, centered)

**Interaction Notes:**
- Tap photo → Toggle selection
- Multi-select enabled
- Tap "Next" → Navigate to Upload Progress Screen
- Tap "Cancel" → Return to previous screen

---

#### Screen 7.2: Upload Progress Screen
**Layout Structure:**
- **Top Navigation Bar:**
  - Close button (left, "X")
  - Title "Uploading Photos" (center)
- **Main Content Area:**
  - **Current Upload:**
    - Thumbnail (centered, ~120x120dp)
    - Filename (below thumbnail, ~16sp, centered)
    - Progress bar (full-width, ~4dp height, ~16dp margin)
    - Progress text: "Uploading... 3 of 15" (~14sp, centered, secondary)
  - **Queue List (below, scrollable):**
    - List of queued photos (thumbnails + filenames)
    - Status indicators (pending, uploading, completed, error)

**Interaction Notes:**
- Upload runs in background
- Can minimize to background (continues uploading)
- Tap close → Show confirmation if uploads in progress
- Tap failed upload → Show retry option
- All uploads complete → Auto-dismiss or show success state

---

#### Screen 7.3: Upload Success/Error States
**Layout Structure:**
- **Success State:**
  - Checkmark icon (centered, ~80dp, green)
  - Success message: "X photos uploaded" (~18sp, bold, centered)
  - "View Photos" button (primary, full-width, ~16dp margin)
  - "Upload More" button (secondary, full-width, ~8dp margin)
- **Error State:**
  - Error icon (centered, ~80dp, red)
  - Error message (~16sp, centered)
  - Error details (~14sp, secondary, centered)
  - "Retry" button (primary, full-width, ~16dp margin)
  - "Cancel" button (secondary, full-width, ~8dp margin)

**Interaction Notes:**
- Tap "View Photos" → Navigate to Home Gallery Screen
- Tap "Upload More" → Return to Photo Selection Screen
- Tap "Retry" → Retry failed uploads
- Tap "Cancel" → Dismiss, return to previous screen

---

### 2.8 Settings Screen

#### Screen 8.1: Settings List
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "Settings" (center)
- **Main Content Area (grouped sections, ~16dp padding):**
  - **Account Section:**
    - User profile card (avatar, name, email)
    - "Account Details" (row, with chevron)
    - "Sign Out" (row, destructive color)
  - **Server Section:**
    - "Server Connection" (row, with chevron, shows current server)
    - "Sync Settings" (row, with chevron)
  - **Appearance Section:**
    - "Theme" (row, with toggle/selector: Light, Dark, System)
  - **Storage Section:**
    - "Cache Size" (row, shows size, with "Clear" action)
    - "Download Quality" (row, with selector)
  - **Privacy Section:**
    - "Face Recognition" (row, with toggle)
    - "Location Data" (row, with toggle)
    - "Analytics" (row, with toggle)
  - **About Section:**
    - "App Version" (row, shows version number)
    - "Help & Support" (row, with chevron)
    - "Privacy Policy" (row, with chevron)
    - "Terms of Service" (row, with chevron)

**Interaction Notes:**
- Tap profile card → Navigate to Account Details
- Tap settings row → Navigate to relevant sub-screen or toggle
- Tap "Sign Out" → Show confirmation, sign out, return to Login Screen
- Toggle switches → Immediate effect (with loading state if needed)

---

#### Screen 8.2: Account Details
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "Account" (center)
  - Edit button (right)
- **Main Content Area:**
  - Profile photo (centered, ~120dp diameter, circular)
  - Name (centered, ~20sp, bold)
  - Email (centered, ~16sp, secondary)
  - **Details List:**
    - "Username" (row, shows value)
    - "Server" (row, shows server address)
    - "Storage Used" (row, shows usage with progress bar)
    - "Member Since" (row, shows date)

**Interaction Notes:**
- Tap edit → Enable editing mode
- Tap profile photo → Open photo picker (if editable)

---

#### Screen 8.3: Server Connection Settings
**Layout Structure:**
- **Top Navigation Bar:**
  - Back arrow (left)
  - Title "Server Settings" (center)
- **Main Content Area:**
  - Current server display (card, shows address, status indicator)
  - "Change Server" button (primary, full-width)
  - "Test Connection" button (secondary, full-width)
  - **Advanced Options (expandable):**
    - "Auto-discover" toggle
    - "Connection timeout" input
    - "SSL/TLS settings" (if applicable)

**Interaction Notes:**
- Tap "Change Server" → Navigate to Server Connection Screen
- Tap "Test Connection" → Show connection test result
- Toggle advanced options → Show/hide advanced settings

---

### 2.9 Error States

#### Screen 9.1: No Photos Empty State
**Layout Structure:**
- **Main Content Area:**
  - Illustration placeholder (centered, ~200dp height)
  - Heading "No photos yet" (~24sp, bold, centered)
  - Description (~16sp, centered, ~2-3 lines)
  - Primary button: "Upload Photos" (centered, ~56dp height, ~16dp margin)

**Interaction Notes:**
- Tap "Upload Photos" → Open Upload Flow

---

#### Screen 9.2: Connection Error State
**Layout Structure:**
- **Main Content Area:**
  - Error icon (centered, ~80dp, red/orange)
  - Heading "Connection Lost" (~24sp, bold, centered)
  - Description (~16sp, centered, ~2-3 lines)
  - Primary button: "Retry" (centered, ~56dp height, ~16dp margin)
  - Secondary link: "Change Server" (centered, ~14sp, tappable)

**Interaction Notes:**
- Tap "Retry" → Attempt reconnection
- Tap "Change Server" → Navigate to Server Connection Settings

---

#### Screen 9.3: Invalid Login State
**Layout Structure:**
- **Same as Login Screen, with:**
  - Error message banner (red background, ~16dp margin, below nav bar)
  - Error text: "Invalid username or password" (~14sp, white)
  - Input fields show error state (red border)
  - Inline error messages below fields

**Interaction Notes:**
- Error persists until user corrects input
- Tap error banner → Dismiss (optional)

---

### 2.10 Share Sheet (Native)
**Layout Structure:**
- Native system share sheet
- Options: Save to device, Share to other apps, Copy link (if remote access enabled)

**Interaction Notes:**
- Follows platform conventions (iOS/Android)

---

### 2.11 Delete Confirmation Dialog
**Layout Structure:**
- **Modal Dialog (centered, ~80% width):**
  - Warning icon (top, ~48dp, red/orange)
  - Title "Delete Photo?" (~20sp, bold, centered)
  - Message "This action cannot be undone" (~16sp, centered, secondary)
  - **Action Buttons (horizontal, full-width):**
    - "Cancel" (left, outlined, ~56dp height)
    - "Delete" (right, primary, destructive color, ~56dp height)

**Interaction Notes:**
- Tap outside dialog → Dismiss (optional, or require button tap)
- Tap "Cancel" → Dismiss dialog
- Tap "Delete" → Confirm deletion, show loading, dismiss dialog, update UI

---

## 3. User Journey Flows

### Flow 1: First-Time Onboarding
1. **Welcome Screen** → User sees app branding
2. **Tap "Get Started"** → Server Connection Screen
3. **Tap "Scan QR Code"** → QR Scanner opens
4. **Scan QR code** → Server address auto-filled
5. **Auto-navigate to Login Screen** → Credentials input
6. **Enter username/password, tap "Sign In"** → Validation
7. **On success** → Permissions Request Screen
8. **Grant permissions** → Home Gallery Screen (first load)

**Alternative Paths:**
- User can skip QR and enter server manually
- User can skip permissions (with limited functionality)
- User can sign in directly from Welcome Screen

---

### Flow 2: Browsing Photos
1. **Home Gallery Screen (Timeline View)** → User sees photo grid
2. **Scroll down** → Load more photos (infinite scroll)
3. **Tap photo** → Photo Viewer opens (full-screen)
4. **Swipe left/right** → Navigate between photos
5. **Tap image** → Toggle UI overlay
6. **Tap info icon** → Photo Info Bottom Sheet slides up
7. **View metadata** → See EXIF, faces, location
8. **Tap face chip** → Navigate to Individual Person View
9. **View all photos of person** → Browse person's photo grid
10. **Tap photo** → Return to Photo Viewer (filtered context)
11. **Swipe down** → Dismiss viewer, return to gallery

**Alternative Paths:**
- User can favorite photo from viewer
- User can share photo from viewer
- User can delete photo from viewer (with confirmation)

---

### Flow 3: Searching
1. **Home Gallery Screen** → Tap search icon
2. **Search Screen opens** → Shows suggestions (people, places, objects)
3. **Type query** → Real-time results appear
4. **Tap suggestion chip** → Filter applied, results shown
5. **Tap filter icon** → Filter Panel opens (bottom sheet)
6. **Select filters** → Apply filters
7. **Results update** → Filtered photos shown
8. **Tap photo result** → Open Photo Viewer
9. **Tap person result** → Navigate to Individual Person View
10. **Tap album result** → Navigate to Album Detail View

**Alternative Paths:**
- User can search by voice (if implemented)
- User can save search (if implemented)
- User can clear filters and start new search

---

### Flow 4: Person Identification
1. **Home Gallery Screen** → Tap "People" filter tab
2. **People Grid View** → See all recognized faces
3. **Tap face card** → Individual Person View opens
4. **View person's photos** → Browse grid
5. **Tap edit icon** → Person Edit Screen opens
6. **Edit name** → Update person name
7. **Tap "Save"** → Changes saved, return to Person View
8. **Tap "Merge"** → Person selection dialog opens
9. **Select another person** → Merge confirmed
10. **Return to Person View** → Merged photos shown

**Alternative Paths:**
- User can add photos to person manually
- User can hide person from main view
- User can delete person grouping

---

### Flow 5: Creating and Viewing Albums
1. **Home Gallery Screen** → Tap "Albums" filter tab
2. **Albums List View** → See all albums
3. **Tap "Create Album"** → Create Album Flow opens
4. **Enter album name** → Type name
5. **Select photos** → Tap photos to select (multi-select)
6. **Tap "Create"** → Album created, navigate to Album Detail View
7. **View album** → See cover image and photo grid
8. **Tap photo** → Open Photo Viewer (album context)
9. **Swipe between photos** → Navigate through album
10. **Tap more options** → Show menu (Edit, Delete, Share)

**Alternative Paths:**
- User can create album from Photo Viewer (add to album)
- User can add photos to existing album
- User can remove photos from album

---

## 4. Interaction Notes

### Gestures

#### Swipe Gestures
- **Swipe left/right on photo** → Navigate to next/previous photo
- **Swipe down on photo viewer** → Dismiss viewer, return to gallery
- **Swipe up on bottom sheet** → Expand sheet (if collapsible)
- **Swipe down on bottom sheet** → Dismiss sheet
- **Swipe left on list item** → Show delete/action options (optional, platform-dependent)

#### Tap Gestures
- **Single tap** → Primary action (open, select, toggle)
- **Double tap** → Zoom in/out (photo viewer)
- **Long press** → Context menu or selection mode
- **Tap outside modal** → Dismiss (if appropriate)

#### Pinch Gestures
- **Pinch/spread** → Zoom in/out (photo viewer)
- **Two-finger pan** → Pan when zoomed (photo viewer)

#### Scroll Behavior
- **Vertical scroll** → Infinite scroll, load more content
- **Horizontal scroll** → Navigate tabs, chips, or carousels
- **Pull to refresh** → Reload content from server
- **Momentum scrolling** → Smooth, native feel

### Haptic Feedback
- **Light tap** → Selection, toggle
- **Medium tap** → Navigation, confirmation
- **Heavy tap** → Destructive actions, errors
- **Success** → Subtle vibration on successful actions
- **Error** → Stronger vibration on errors

### Animation Guidelines
- **Screen transitions** → Slide (horizontal for forward, vertical for modals)
- **Bottom sheet** → Slide up from bottom (~300ms)
- **Photo viewer** → Fade + scale (hero animation from thumbnail)
- **Loading states** → Skeleton screens or progress indicators
- **Success states** → Checkmark animation (~500ms)
- **Error states** → Shake animation on invalid input

### Accessibility
- **VoiceOver/TalkBack support** → All interactive elements labeled
- **Dynamic type** → Text scales with system settings
- **Color contrast** → Meets WCAG AA standards
- **Touch targets** → Minimum 44x44dp (iOS) / 48x48dp (Android)
- **Focus indicators** → Clear focus states for keyboard navigation

---

## 5. Suggested UX Improvements

### 5.1 Enhanced Search Experience
- **Visual search** → Allow users to search by uploading a photo (find similar photos)
- **Smart suggestions** → Learn from user behavior, prioritize frequently searched terms
- **Recent searches** → Show recent search history with quick access
- **Saved searches** → Allow users to save complex search queries
- **Search by date range** → Calendar picker for date-based searches

### 5.2 Improved Photo Organization
- **Smart albums** → Auto-create albums based on events, locations, or dates
- **Tags system** → Allow manual tagging with autocomplete suggestions
- **Collections** → Group albums into collections for better organization
- **Archive feature** → Hide photos without deleting (separate archive view)
- **Favorites collection** → Dedicated favorites view with quick access

### 5.3 Enhanced People Features
- **Relationship tagging** → Tag relationships (family, friends, etc.)
- **Face quality indicator** → Show which photos have best face recognition quality
- **Bulk face operations** → Select multiple faces to merge or tag at once
- **Face search** → Search for photos containing specific combinations of people
- **People statistics** → Show photo count over time, most photographed together, etc.

### 5.4 Better Upload Experience
- **Background upload** → Continue uploading when app is in background
- **Upload queue management** → Pause, resume, or cancel uploads
- **Bulk selection** → Select photos by date range or album from device
- **Upload presets** → Save upload settings (quality, albums, etc.)
- **Wi-Fi only upload** → Option to upload only on Wi-Fi to save data

### 5.5 Advanced Viewing Options
- **Map view** → View all photos on a map with clustering
- **Timeline view** → Horizontal timeline scrubber for quick navigation
- **Comparison view** → Side-by-side photo comparison
- **Slideshow mode** → Auto-play photos with transitions and music (if implemented)
- **Full-screen immersive mode** → Hide all UI for distraction-free viewing

### 5.6 Performance Optimizations
- **Progressive loading** → Load low-res thumbnails first, then high-res
- **Smart caching** → Cache frequently viewed photos and albums
- **Lazy loading** → Load content as user scrolls
- **Image optimization** → Serve appropriately sized images based on screen density
- **Offline mode** → Cache recent photos for offline viewing

### 5.7 Social & Sharing Features
- **Shared albums** → Create albums that can be shared with other users (if multi-user)
- **Photo comments** → Add comments to photos (if multi-user)
- **Export options** → Export photos with metadata, or as ZIP file
- **Print integration** → Direct printing from app (if platform supports)
- **Backup reminders** → Remind users to backup important photos

### 5.8 Onboarding Improvements
- **Interactive tutorial** → Step-by-step guide for first-time users
- **Sample data** → Option to load sample photos for exploration
- **Quick start guide** → Highlight key features and gestures
- **Permission explanations** → Better explanations of why permissions are needed
- **Server discovery** → Automatic server discovery on local network

### 5.9 Error Handling & Recovery
- **Retry mechanisms** → Automatic retry with exponential backoff
- **Offline indicators** → Clear visual indicators when offline
- **Sync status** → Show sync status and last sync time
- **Conflict resolution** → Handle conflicts when same photo uploaded multiple times
- **Error reporting** → User-friendly error messages with actionable solutions

### 5.10 Personalization
- **Customizable home screen** → Allow users to choose default view (timeline, albums, people)
- **Layout preferences** → Choose grid density (2, 3, or 4 columns)
- **Sort options** → Sort by date, name, size, etc.
- **View preferences** → Remember user's preferred view settings
- **Quick actions** → Customizable quick actions for frequently used features

---

## 6. Navigation Architecture

### Primary Navigation (Bottom Bar)
- **Photos** → Home Gallery Screen (default)
- **Search** → Search Screen
- **Albums** → Albums List View
- **People** → Face Groups Grid
- **Settings** → Settings Screen (or use profile icon in top nav)

### Secondary Navigation
- **Top navigation bar** → Context-specific actions (back, title, actions)
- **Floating Action Button** → Primary action (upload photos)
- **Bottom sheets** → Contextual actions and information
- **Modal screens** → Full-screen flows (onboarding, upload, etc.)

### Navigation Patterns
- **Stack navigation** → Forward/backward navigation (Photos → Photo Viewer → Info)
- **Tab navigation** → Primary sections (bottom bar)
- **Modal navigation** → Overlay screens (upload, settings, etc.)
- **Deep linking** → Support URLs for specific photos, albums, people

---

## 7. Data Flow & State Management

### Screen States
- **Loading** → Skeleton screens or progress indicators
- **Empty** → Illustrations with call-to-action
- **Error** → Error messages with retry options
- **Success** → Confirmation states with next actions
- **Offline** → Offline indicators with cached content

### Sync States
- **Syncing** → Show sync progress in relevant screens
- **Synced** → Subtle indicator of last sync time
- **Conflict** → Handle and resolve sync conflicts
- **Failed** → Show error with retry option

### Cache Strategy
- **Thumbnails** → Cache all thumbnails locally
- **Recent photos** → Cache full-resolution recent photos
- **Metadata** → Cache all metadata locally
- **Offline access** → Allow viewing cached content when offline

---

## 8. Platform-Specific Considerations

### iOS
- **Native share sheet** → Use UIActivityViewController
- **Photo picker** → Use PHPickerViewController
- **Haptic feedback** → Use UIImpactFeedbackGenerator
- **Navigation** → Use UINavigationController patterns
- **Bottom sheets** → Use UISheetPresentationController (iOS 15+)

### Android
- **Native share sheet** → Use Intent.ACTION_SEND
- **Photo picker** → Use PhotoPicker (Android 13+) or Intent
- **Haptic feedback** → Use Vibrator or HapticFeedback
- **Navigation** → Use Navigation Component
- **Bottom sheets** → Use BottomSheetDialogFragment

### Cross-Platform Considerations
- **Consistent UX** → Maintain same interaction patterns
- **Platform conventions** → Follow platform-specific UI guidelines
- **Performance** → Optimize for both platforms
- **Accessibility** → Support platform-specific accessibility features

---

## 9. Wireframe Annotations Legend

### Layout Elements
- **Grid** → Multi-column layout (specify columns: 2-column, 3-column, etc.)
- **List** → Vertical list of items
- **Card** → Rounded container with content
- **Bottom Sheet** → Slide-up panel from bottom
- **Modal** → Full-screen overlay
- **Dialog** → Centered popup dialog

### Interactive Elements
- **Button** → Tappable action (specify style: primary, secondary, outlined, text)
- **FAB** → Floating Action Button (circular, elevated)
- **Toggle** → Switch or checkbox
- **Input Field** → Text input (specify type: text, password, search, etc.)
- **Chip** → Small rounded button/tag

### Navigation Elements
- **Top Nav Bar** → Header with back, title, actions
- **Bottom Nav Bar** → Primary navigation tabs
- **Tab Bar** → Horizontal filter tabs
- **Breadcrumb** → Navigation path indicator (if needed)

### Content Elements
- **Thumbnail** → Small image preview
- **Placeholder** → Empty state illustration or image
- **Icon** → Small graphical element (specify size: 24dp, 48dp, etc.)
- **Badge** → Small indicator overlay (notification, count, etc.)

### Spacing
- **Margin** → Outer spacing (specify: 8dp, 16dp, 24dp, etc.)
- **Padding** → Inner spacing (specify: 8dp, 16dp, 24dp, etc.)
- **Spacing** → Gap between elements (specify: 4dp, 8dp, 12dp, 16dp, etc.)

### Typography
- **Heading** → Large, bold text (specify size: 24sp, 32sp, etc.)
- **Body** → Regular text (specify size: 14sp, 16sp, etc.)
- **Secondary** → Lighter, smaller text (specify size: 12sp, 14sp, etc.)
- **Caption** → Small helper text (specify size: 12sp, etc.)

---

## 10. Implementation Priority

### Phase 1: Core Experience (MVP)
1. Onboarding flow (Welcome, Server Connection, Login)
2. Home Gallery (Timeline view, photo grid)
3. Photo Viewer (basic viewing, swipe navigation)
4. Upload flow (photo selection, upload progress)
5. Settings (basic settings, server connection)

### Phase 2: Organization Features
1. Albums (list, detail, create)
2. People (face groups, individual person view)
3. Search (basic search, filters)
4. Photo Info (metadata, EXIF, location)

### Phase 3: Enhanced Features
1. Advanced search (visual search, smart suggestions)
2. People management (edit, merge, hide)
3. Enhanced upload (background, queue management)
4. Offline mode (caching, offline viewing)

### Phase 4: Polish & Optimization
1. Performance optimizations
2. Advanced gestures and animations
3. Accessibility improvements
4. Error handling and recovery
5. User personalization options

---

## Conclusion

This wireframe specification provides a comprehensive foundation for building the Photonix mobile application. The design emphasizes modern UX patterns, intuitive navigation, and a clean, minimal aesthetic that prioritizes the user's photo browsing experience.

The specification is structured to be implementation-agnostic, focusing on user experience and interaction patterns rather than specific technical implementations. Designers and developers can use this document as a reference to create detailed UI mockups and implement the application across iOS and Android platforms.

**Next Steps:**
1. Review and refine wireframe specifications based on stakeholder feedback
2. Create detailed UI mockups based on these wireframes
3. Develop interactive prototypes for user testing
4. Iterate based on user feedback and testing results
5. Begin implementation with Phase 1 (Core Experience)

---

*Document Version: 1.0*  
*Last Updated: 2025*  
*Status: Draft - Ready for Review*

