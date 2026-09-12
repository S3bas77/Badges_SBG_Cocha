# Requirements Document

## Introduction

The AWS Student Community Day Badge Generator is a web application that allows attendees to create personalized event badges in two portrait formats: 4:5 (Instagram portrait) and 9:16 (Instagram Story / vertical). Users upload their photograph, customize positioning and zoom within a defined photo area, select their desired output format, preview the badge in real time, and download a high-resolution PNG. The design adapts each layout to its respective aspect ratio while maintaining a shared visual identity, branding, typography, event information, and photographic treatment.

## Glossary

- **Badge_Generator**: The web application described in this document.
- **Photo_Area**: The bounded region within the badge layout where the user's photograph is displayed. Its dimensions and position are defined per Format by the visual design.
- **Format**: One of the two supported output aspect ratios — 4:5 (1080 × 1350 px) or 9:16 (1080 × 1920 px).
- **Preview**: The real-time on-screen representation of the badge at reduced scale, reflecting all current user inputs and the selected Format.
- **Canvas**: The HTML canvas element used to composite all badge layers and produce the exportable PNG.
- **Export**: The action of rendering the badge at the full target resolution and triggering a PNG download.
- **Photo_Transform**: The combination of position offset and zoom scale applied by the user to the photograph within the Photo_Area. Rotation is not included.
- **Design_System**: The shared set of colors, typography, hierarchy, and branding elements applied across both Formats.
- **Role**: The attendee's participation category. One of: Participante, Speaker, Organizador, Voluntario.
- **Initial Framing**: The default crop-to-fill state applied when a photograph is first uploaded, centering the image within the Photo_Area at the minimum zoom level.

---

## Requirements

### Requirement 1: Format Selection

**User Story:** As an attendee, I want to choose between a 4:5 and a 9:16 badge format, so that I can create a badge that fits the social media platform I intend to use.

#### Acceptance Criteria

1. THE Badge_Generator SHALL display two selectable format options: "4:5 — Instagram portrait" and "9:16 — Instagram Story / vertical", with the "4:5 — Instagram portrait" format selected by default on load.
2. WHEN the user selects a Format, THE Badge_Generator SHALL update the Preview to reflect the selected Format's aspect ratio without requiring any additional action from the user.
3. WHEN the user selects a Format, THE Badge_Generator SHALL preserve all previously entered user data and Photo_Transform (position and zoom) during the transition.
4. THE Badge_Generator SHALL apply a visually distinct selected state to the currently active Format option — differentiated from the unselected state by at least one of: a border, a background color change, or a checkmark indicator — so the user can identify which Format is active at all times.

---

### Requirement 2: Photograph Upload

**User Story:** As an attendee, I want to upload my photo to the badge, so that my badge is personalized with my image.

#### Acceptance Criteria

1. THE Badge_Generator SHALL provide a control that allows the user to upload an image file from their device.
2. WHEN the user uploads a file that is not a JPEG, PNG, WebP, or GIF, or that exceeds 10 MB, THE Badge_Generator SHALL display an error message indicating the accepted file types and the maximum file size, AND SHALL NOT update the Photo_Area.
3. WHEN the user uploads a valid image file of 10 MB or less, THE Badge_Generator SHALL display the photograph inside the Photo_Area using the Initial Framing: centered crop-to-fill at the minimum zoom level that fully covers the Photo_Area, preserving the original aspect ratio.
4. THE Badge_Generator SHALL NOT stretch or distort the uploaded photograph at any point during display or Export.
5. THE Badge_Generator SHALL NOT remove, replace, or alter the background of the uploaded photograph. The original photograph, including its background, must be preserved as-is.

---

### Requirement 3: Photo Repositioning and Zoom

**User Story:** As an attendee, I want to reposition and zoom my photo within the photo area, so that my face is framed correctly in the badge.

#### Acceptance Criteria

1. WHEN a photograph is loaded, THE Badge_Generator SHALL allow the user to drag the photograph to reposition it within the Photo_Area, clamping the drag offset so that every pixel of the Photo_Area remains covered by the photograph at all times.
2. WHEN a photograph is loaded, THE Badge_Generator SHALL provide a zoom control that scales the photograph uniformly within the Photo_Area without altering the Photo_Area boundaries. The minimum zoom level SHALL be the scale at which the photograph exactly covers the entire Photo_Area with no empty space. The maximum zoom level SHALL be a technically reasonable upper bound defined by the implementation, sufficient to allow meaningful close-up framing, while ensuring the Photo_Area remains fully covered with no empty space at any zoom level within the allowed range.
3. WHILE the user adjusts the Photo_Transform, THE Badge_Generator SHALL update the Preview within 100 milliseconds to reflect each change.
4. THE Badge_Generator SHALL clip the photograph to the Photo_Area boundary so that no part of the photograph is rendered outside the Photo_Area.
5. IF the user switches Format, THEN THE Badge_Generator SHALL adapt the Photo_Transform to the new Format's Photo_Area dimensions, scaling the position offset proportionally so that the visible framing is preserved as closely as possible.

---

### Requirement 4: Reset Photo

**User Story:** As an attendee, I want to reset my photo framing to the default position, so that I can start repositioning from a clean state.

#### Acceptance Criteria

1. THE Badge_Generator SHALL provide a "Reset Photo" control that is available whenever a photograph is loaded.
2. WHEN the user activates the Reset Photo control, THE Badge_Generator SHALL restore the Photo_Transform to the Initial Framing — centered crop-to-fill at the minimum zoom level — for the currently active Format's Photo_Area.
3. WHEN the user activates the Reset Photo control, THE Badge_Generator SHALL update the Preview immediately to reflect the restored framing.

---

### Requirement 5: Live Preview

**User Story:** As an attendee, I want to see a live preview of my badge before downloading, so that I can verify the result looks correct.

#### Acceptance Criteria

1. WHILE the attendee is on the badge creation screen, THE Badge_Generator SHALL render a Preview of the badge reflecting the current Format, Photo_Transform, and all Design_System elements.
2. WHEN any user input changes (Format selection, photograph upload, photo repositioning, zoom, or reset), THE Badge_Generator SHALL update the Preview within 100 milliseconds.
3. THE Preview SHALL maintain the correct aspect ratio of the selected Format (4:5 or 9:16) at all displayed sizes.
4. THE Preview SHALL display all Design_System elements — typography, branding, colors, hierarchy, and event information — in the positions defined by the active Format's layout.
5. IF no photograph has been uploaded, THEN THE Badge_Generator SHALL display a placeholder graphic in the Photo_Area of the Preview that occupies the same dimensions as the Photo_Area in the active Format.
6. THE Preview SHALL produce a visual output identical in layout, crop, and Design_System element positions to the badge generated upon Export for the same Format and Photo_Transform values.

---

### Requirement 6: Badge Export

**User Story:** As an attendee, I want to download my badge as a high-resolution PNG, so that I can share it on social media.

#### Acceptance Criteria

1. THE Badge_Generator SHALL provide a single download control that triggers the Export of the badge as a PNG file.
2. WHEN the user triggers Export with the 4:5 Format selected, THE Badge_Generator SHALL produce a PNG at exactly 1080 × 1350 pixels.
3. WHEN the user triggers Export with the 9:16 Format selected, THE Badge_Generator SHALL produce a PNG at exactly 1080 × 1920 pixels.
4. THE Badge_Generator SHALL Export only the currently selected Format when the user triggers the download control.
5. WHEN the Export is complete, THE Badge_Generator SHALL initiate an automatic file download of the PNG to the user's device.
6. THE Badge_Generator SHALL render all Design_System elements, the Photo_Area, and the Photo_Transform at the full target resolution during Export, matching the layout shown in the Preview.
7. IF the Export process fails, THEN THE Badge_Generator SHALL display an error message indicating the failure and preserve the current badge configuration without resetting any user input.
8. WHEN the Export is in progress, THE Badge_Generator SHALL disable the download control until the Export is complete or has failed.

---

### Requirement 7: Layout Adaptation Across Formats

**User Story:** As an attendee, I want the badge to look visually consistent and well-composed regardless of the format I choose, so that either download option looks professional.

#### Acceptance Criteria

1. THE Badge_Generator SHALL apply the Design_System (colors, typography, hierarchy, branding, and event information) consistently across both Formats so that the same color values, font families, font weights, and visual hierarchy are present in each Format's output.
2. THE Badge_Generator SHALL NOT stretch, squash, or mathematically scale one Format's layout into the other. Each Format SHALL have its own optimized composition, element positions, spacing, and Photo_Area dimensions as defined by the visual design.
3. THE Badge_Generator SHALL NOT distort any Design_System element or the Photo_Area when rendering either Format.
4. THE Badge_Generator SHALL render the photograph in the Photo_Area using the same photographic treatment (crop-to-fill, no background removal) across both Formats.

---

### Requirement 8: Attendee Information

**User Story:** As an attendee, I want the badge to display my name and role, so that my badge identifies me at the event.

#### Acceptance Criteria

1. THE Badge_Generator SHALL display the attendee's name on the badge.
2. THE Badge_Generator SHALL display the attendee's Role on the badge. The Role SHALL be one of: Participante, Speaker, Organizador, Voluntario.
3. WHEN the attendee's name is too long to fit on a single line at the default text size, THE Badge_Generator SHALL reduce the font size responsively or wrap the name to a second line so that the name does not overflow the badge boundary, does not overlap the Role label, and the visual hierarchy between name and role is preserved.
4. THE Badge_Generator SHALL ensure that at no font size reduction or line-wrapping configuration does the attendee name text overlap any other badge element.

---

### Requirement 9: Badge Design System

**User Story:** As an event organizer, I want the badge to reflect the AWS Student Community Day brand, so that all attendee badges share a consistent visual identity.

#### Acceptance Criteria

1. THE Badge_Generator SHALL render the event name "AWS Student Community Day" on the badge using the typeface and sizing defined in the Design_System.
2. THE Badge_Generator SHALL render the event date "10 October 2026" and the event location "Cochabamba, Bolivia" on the badge. These values are fixed and are not user-editable.
3. THE Badge_Generator SHALL render the AWS logo or wordmark on the badge at the dimensions, clear space, and placement specified in the Design_System without distortion, cropping, or recoloring.
4. WHILE displaying the badge in any Format, THE Badge_Generator SHALL preserve the visual hierarchy defined by the Design_System, with the attendee name as the most prominent text element, followed by the Role, followed by the event information.
5. IF a required Design_System asset such as the AWS logo or a specified typeface is unavailable at render time, THEN THE Badge_Generator SHALL halt badge rendering and display an error indicating which asset could not be loaded, without producing a partially branded badge.
