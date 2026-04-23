<div align="center">

# TidyTribe

### Turn household chaos into teamwork.

TidyTribe is a mobile-first chore app for families. Sign in, create or join a household, assign chores, earn stars, and redeem rewards across devices with Firebase sync.

[Screenshots](#screenshots) • [Features](#features) • [Getting Started](#getting-started) • [Project Structure](#project-structure)

![PWA](https://img.shields.io/badge/PWA-ready-79c98c)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-f4b942)
![Mobile First](https://img.shields.io/badge/Design-mobile--first-8ab6e5)

</div>

<p align="center">
  <img src="assets/screenshots/dashboard.png" alt="TidyTribe dashboard" width="290" />
</p>

## Why TidyTribe?

Most family chore apps feel like spreadsheets. TidyTribe is designed more like a lightweight household companion:

- A simple sign-in flow for each family member
- Shared household data synced in real time with Firestore
- A personal "My Day" dashboard with streaks, reminders, and weekly progress
- Invite-code based family setup so new members can join quickly
- Rewards that turn completed chores into something motivating
- PWA support so it works like a home-screen app on mobile

## Screenshots

| Dashboard | Family |
| --- | --- |
| ![Dashboard](assets/screenshots/dashboard.png) | ![Family](assets/screenshots/family.png) |

| Chores | Rewards |
| --- | --- |
| ![Chores](assets/screenshots/chores.png) | ![Rewards](assets/screenshots/rewards.png) |

## Features

### Household setup

- Sign in with Google or Apple
- Create a household or join one with a 6-character invite code
- Keep a per-device family profile so each device knows who is using it

### Daily chore flow

- Add chores with assignees, due dates, and star values
- View chores in a list or calendar layout
- Mark chores complete with instant visual feedback
- Track overdue work and upcoming tasks from the dashboard

### Family motivation

- See streaks, weekly completion stats, and a family leaderboard
- Add rewards with required star totals
- Let parents manage rewards while kids can redeem what they can afford

### Mobile app behavior

- Installable Progressive Web App
- Service worker support for offline fallback
- Notification prompts for due-date reminders
- Designed around a mobile tab-bar interface instead of a desktop admin layout

## How It Works

1. Sign in with Google or Apple.
2. Create a new household or join one with an invite code.
3. Add family members, chores, and rewards.
4. Complete chores to earn stars.
5. Redeem rewards when enough stars are available.
6. Stay in sync across devices through Firebase Auth and Firestore.

## Getting Started

### 1. Clone the project

```bash
git clone https://github.com/monikad/TidyTribe.git
cd TidyTribe
```

### 2. Add your Firebase config

This app expects a local config file at `utils/env.js`.

```bash
cp utils/env.example.js utils/env.js
```

Then fill in `utils/env.js` with your Firebase project values:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

You also need Firebase Authentication and Firestore enabled in your Firebase project.

### 3. Run the local server

Using the bundled Python server:

```bash
python3 server.py
```

Or choose a custom port:

```bash
python3 server.py 3000
```

Open the app at:

- `http://localhost:8000`
- or `http://localhost:3000`

The local server prints your LAN IP too, so you can open the app on your phone while testing on the same Wi-Fi network.

## Firebase Notes

TidyTribe is a static frontend, but it is not a no-backend demo. The core product flow depends on Firebase:

- Firebase Auth for Google and Apple sign-in
- Firestore for household data and live multi-device sync
- Local storage only for device-level profile and cached state

If Firebase is not configured, the app will not move through the real sign-in and household flow.

## Project Structure

```text
TidyTribe/
├── index.html
├── styles.css
├── app.js
├── store.js
├── server.py
├── manifest.json
├── service-worker.js
├── assets/
│   ├── avatars/
│   ├── icons/
│   └── screenshots/
├── components/
│   ├── onboarding.js
│   ├── dashboard.js
│   ├── chores.js
│   ├── calendar.js
│   ├── members.js
│   ├── rewards.js
│   ├── modals.js
│   └── newModals.js
└── utils/
    ├── auth.js
    ├── firebase-config.js
    ├── notifications.js
    ├── safety.js
    ├── streaks.js
    └── sync.js
```

## Stack

- HTML, CSS, and modular vanilla JavaScript
- Firebase Authentication
- Firebase Firestore
- Service Worker and Web App Manifest for PWA support
- Python `http.server`-based local dev server

## Status

This repository is set up as a real product prototype with live auth, household sync, and mobile-first UI flows. The screenshots in this README are captured from the current app in this repo.

**app.js** - Main entry point
- Initializes the app
- Manages routing and navigation
- Coordinates view rendering

**store.js** - State management
- Manages all application data
- Handles localStorage persistence
- Provides subscription mechanism for state changes
- CRUD operations for members, chores, and rewards

**components/** - UI modules
- Each component is self-contained
- Handles its own rendering and event listeners
- Calls store methods for data operations

**utils/logger.js** - Debugging
- Centralized logging system
- Color-coded console output
- Tracks user actions, data changes, validation, etc.

### State Management Flow

```
User Action → Event Handler → Store Method → State Update → 
localStorage Save → Notify Subscribers → Re-render View
```

### Adding New Features

1. **Add Store Method** (store.js)
   ```javascript
   newFeature(data) {
       storeLogger.info('New feature', data);
       // Logic here
       this.saveToStorage();
       this.notifyListeners();
   }
   ```

2. **Update UI Component**
   ```javascript
   // In relevant component file
   import store from '../store.js';
   
   function handleNewFeature() {
       store.newFeature(data);
   }
   ```

3. **Add UI Elements** (in component render function)
   - Update HTML generation
   - Attach event listeners
   - Handle user input

### Console Logging

Every significant action is logged. Open DevTools Console to see:

- **INFO** (Blue): General information and navigation
- **SUCCESS** (Green): Successful operations
- **WARNING** (Orange): Validation failures, non-critical issues
- **ERROR** (Pink): Errors and failures
- **DEBUG** (Purple): Detailed debugging information

Access debug helpers in console:
```javascript
window.debugStore      // Direct access to store
window.debugLogger     // Logger instance
```

---

## Architecture

### Data Flow

```
┌─────────────┐
│   index.html│
│   (Shell)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   app.js    │◄────►│  store.js    │
│  (Router)   │      │  (State)     │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│ components/ │      │ localStorage │
│  (Views)    │      │ (Persistence)│
└─────────────┘      └──────────────┘
```

### Component Lifecycle

1. **Init**: App loads, store initializes from localStorage
2. **Render**: Component generates HTML based on state
3. **Attach**: Event listeners bound to DOM elements
4. **Action**: User interacts, triggers store method
5. **Update**: Store updates state and notifies subscribers
6. **Re-render**: Components re-render with new state

### State Structure

```javascript
{
  familyMembers: [
    { id, name, avatar, points }
  ],
  chores: [
    { id, name, assignedTo, dueDate, status, points }
  ],
  rewards: [
    { id, name, requiredPoints, description }
  ],
  activityLog: [
    { timestamp, activity }
  ]
}
```

---

## Data Model

### Family Member
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier |
| name | string | Member's name |
| avatar | string\|null | Avatar image URL |
| points | number | Accumulated points/stars |

### Chore
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier |
| name | string | Chore description |
| assignedTo | number\|null | Member ID |
| dueDate | string | ISO date format |
| status | string | 'Pending' or 'Completed' |
| points | number | Points awarded on completion |

### Reward
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier |
| name | string | Reward name |
| requiredPoints | number | Cost in points |
| description | string | Reward description |

### Activity Log Entry
| Field | Type | Description |
|-------|------|-------------|
| timestamp | string | ISO timestamp |
| activity | string | Description of action |

---

## Debugging

### Console Logs

Open Chrome DevTools (Cmd+Option+J) to see detailed logs:

**Application Lifecycle:**
- App initialization
- View navigation
- Component rendering

**User Actions:**
- Button clicks
- Form submissions
- Checkbox toggles

**Data Operations:**
- CRUD operations
- State changes
- localStorage saves

**Validation:**
- Input validation results
- Error messages

### Debug Helpers

In the browser console:

```javascript
// View current state
window.debugStore.state
install on iPhone

**Solution:**
- Must use Safari (not Chrome or other browsers)
- App must be served over HTTPS or localhost
- Check that manifest.json is accessible
- Ensure all icon files exist

### Issue: Install prompt doesn't appear

**Solution:**
- App must be served over HTTPS (not file://)
- Visit the site multiple times (Chrome requirement)
- Check console for Service Worker errors
- Clear browser cache and try again

### Issue: App doesn't work offline

**Solution:**
- Ensure Service Worker registered successfully
- Check DevTools → Application → Service Workers
- Try refreshing after installation
- Check console for caching errors

// Clear all data (reset app)
window.debugStore.clearStorage()

// Manual logging
window.debugLogger.info('Custom log', { data: 'here' })
```

### Common Debugging Steps

1. **Check localStorage:**
   ```javascript
   localStorage.getItem('family-chore-manager-data')
   ```

2. **Monitor state changes:**
   ```javascript
   window.debugStore.subscribe(state => console.log('State:', state))
   ```

3. **Test store methods:**
   ```javascript
   window.debugStore.addMember({ name: 'Test' })
   ```

---

## API Integration

The app supports integration with AI and audio transcription APIs:

### GPT-4 Integration (Optional)

**Endpoint:** `https://api.wearables-ape.io/models/v1/chat/completions`

**API Key:** `e47d4054-d7df-4b8b-9755-6d04bb487781`

**Example Usage:**
```javascript
async function getChoresSuggestion() {
    const response = await fetch('https://api.wearables-ape.io/models/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer e47d4054-d7df-4b8b-9755-6d04bb487781'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: 'Suggest 5 age-appropriate chores for a 10-year-old'
            }],
            max_tokens: 2000
        })
    });
    return await response.json();
}
```

### Whisper Audio Transcription (Optional)

**Endpoint:** `https://api.wearables-ape.io/models/v1/audio/transcriptions`

**Example Usage:**
```javascript
async function transcribeAudio(audioFile) {
    const formData = new FormData();
    formData.append('model', 'whisper');
    formData.append('language', 'en');
    formData.append('file', audioFile);
    
    const response = await fetch('https://api.wearables-ape.io/models/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer e47d4054-d7df-4b8b-9755-6d04bb487781'
        },
        body: formData
    });
    return await response.json();
}
```

**Note:** These API integrations are optional and not required for core functionality.

---

## Troubleshooting

### Issue: App won't load

**Solution:**
- Ensure you're using a modern browser (Chrome/Firefox/Safari)
- Check browser console for errors
- Try opening via HTTP server instead of file://

### Issue: Data not persisting

**Solution:**
- Check if localStorage is enabled in browser
- Clear browser cache and reload
- Check DevTools → Application → Local Storage

### Issue: Images not loading

**Solution:**
- Use relative paths: `/assets/avatars/name.png`
- Or use absolute URLs for external images
- Check browser console for 404 errors

### Issue: Modal not closing

**Solution:**
- Click outside the modal box
- Press the × close button
- Check console for JavaScript errors

### Issue: Points not updating

**Solution:**
- Ensure chore is assigned to a member
- Check if chore status changed to "Completed"
- View console logs for state changes

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |

**Requirements:**
- ES6 Modules support
- localStorage support
- CSS Grid and Flexbox support

---

## Security & Privacy

⚠️ **Important:** This application is designed for local use only.

- All data stored in browser's localStorage
- No data transmitted to external servers (except optional API calls)
- API keys visible in frontend (acceptable for local-only use)
- No authentication or encryption implemented
- Not suitable for public deployment without modifications

---

## Future Enhancements

Potential features for future versions:

- 🔄 Recurring chores (daily, weekly, monthly)
- 📸 Photo/video proof of chore completion
- 🏆 Achievements and badges
- 📅 Calendar view for chores
- 👥 Multi-household support
- 📊 Advanced analytics and charts
- 🔔 Browser notifications for due dates
- 📤 Export/import data (JSON/CSV)
- 🎨 Theme customization
- 🌐 Multi-language support

---

## Contributing

This is a personal project, but suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## License

MIT License - Feel free to use, modify, and distribute.

---

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review console logs for errors
3. Check browser compatibility
4. Open an issue on GitHub (if applicable)

---

## Changelog

### Version 1.0.0 (February 2026)
- Initial release
- Core chore management features
- Points and rewards system
- Neon dark theme UI
- localStorage persistence
- Extensive debugging logs

---

## Original Prompt

This section contains the complete, unedited original prompt that was used to create this application, serving as a reference for understanding the project requirements and design decisions.

---

**Family Chores Manager**

Here is a description for an application I need you to create. Please think of the right implementation, architecture, dependencies and resources needed and propose a plan. You must NOT not start coding and creating files until the user has approved your plan.

**Application Title:** Family Chore Manager

**Purpose of the application:** The Family Chore Manager is designed to help families organize, assign, and track household chores in a simple and engaging way. The application allows users to add and manage family members, create and assign chores, and monitor completion status. It motivates participation through a customizable points or stars system, where completed chores earn rewards such as allowance or special treats. The app aims to foster teamwork, responsibility, and positive reinforcement within the family, making household management easy and fun for everyone.

**Known UI Elements Required:**

1. The application features a modern, high-contrast dark mode interface with a visually striking neon aesthetic. The background is a deep, nearly black shade, providing a sleek and professional canvas. Key interface elements—such as borders, section dividers, and text—are highlighted with vibrant neon colors, primarily purples and blues, creating a futuristic and energetic vibe. Text is rendered in bright, high-contrast hues (such as neon blue, purple, and white) for maximum readability against the dark background. Buttons and interactive elements are outlined or filled with glowing neon effects, and the overall layout is clean, organized, and spacious, with clear separation between sections. The font is modern and sans-serif, contributing to a tech-forward, approachable feel.
   - Dark background with neon purple and blue accents
   - Modern, sans-serif font
   - Glowing neon borders and buttons
   - Clean, organized layout with clear sectioning
   - High-contrast, bright text for readability

2. **UI Components:**
   1. Header / App Title - Clearly displays the app name ("Family Chore Manager") at the top.
   2. Family Member List - Section showing all family members (names and optional avatars). "Add Family Member" button. Edit and delete icons for each member.
   3. Chore List - Section showing all chores as a list or cards. Chore name, Assigned family member, Due date, Status (e.g., pending, completed), "Add Chore" button. Edit and delete icons for each chore.
   4. Chore Completion - Checkbox or toggle to mark a chore as complete.
   5. Points/Stars Tracker - Display of points or stars earned by each family member (simple counter or badge).
   6. Rewards - List of available rewards (name and required points/stars). "Redeem" button for rewards.
   7. Basic Navigation - Simple navigation bar or menu to switch between main sections (e.g., Dashboard, Chores, Rewards).

**User Flows:**

1. **App Launch / First Load** - User opens the app. The app displays the Dashboard, showing a summary of chores, points/stars, and rewards. If no family members or chores exist, the app prompts the user to add their first family member and chore.

2. **Adding a Family Member** - User clicks the "Add Family Member" button. A modal or form appears, asking for the member's name (and optional avatar). User enters details and clicks "Save." The new family member appears in the Family Member List.

3. **Adding a Chore** - User clicks the "Add Chore" button. A modal or form appears, asking for: Chore name, Assigned family member (dropdown), Due date, Points/stars value. User enters details and clicks "Save." The new chore appears in the Chore List, assigned to the selected family member.

4. **Editing or Deleting Family Members/Chores** - User clicks the edit icon next to a family member or chore. A modal or form appears with current details. User updates details and clicks "Save," or clicks "Delete" to remove. The list updates accordingly.

5. **Marking a Chore as Complete** - User finds the assigned chore in the Chore List. User clicks the checkbox or toggle to mark the chore as complete. The app updates the status to "Completed." The assigned family member's points/stars increase by the chore's value.

6. **Tracking Points/Stars** - The Dashboard and/or Family Member List displays each member's current points/stars. Points/stars update automatically as chores are completed.

7. **Redeeming Rewards** - User navigates to the Rewards section. User views available rewards and their required points/stars. If a family member has enough points/stars, user clicks "Redeem." The app deducts the required points/stars and confirms the reward redemption.

8. **Navigation** - User can switch between Dashboard, Family Members, Chores, and Rewards using the navigation bar or menu.

**User inputs and actions to take on these inputs:**

1. **Add Family Member** - Input: User clicks "Add Family Member" and enters a name (and optionally an avatar). Action: Validate the input (ensure the name is not empty). Add the new family member to the list. Display the new member in the Family Member section.

2. **Edit Family Member** - Input: User clicks the edit icon next to a family member, updates the name/avatar, and clicks "Save." Action: Validate the updated input. Update the family member's details in the list. Reflect changes immediately in the UI.

3. **Delete Family Member** - Input: User clicks the delete icon next to a family member and confirms deletion. Action: Remove the family member from the list. Unassign or delete any chores assigned to this member (or prompt user for action). Update the UI to reflect the removal.

4. **Add Chore** - Input: User clicks "Add Chore" and enters chore name, selects an assignee, sets a due date, and assigns points/stars. Action: Validate all fields (e.g., name not empty, assignee selected). Add the new chore to the Chore List. Display the new chore in the UI, assigned to the selected family member.

5. **Edit Chore** - Input: User clicks the edit icon next to a chore, updates details, and clicks "Save." Action: Validate updated fields. Update the chore's details in the list. Reflect changes immediately in the UI.

6. **Delete Chore** - Input: User clicks the delete icon next to a chore and confirms deletion. Action: Remove the chore from the list. Update the UI to reflect the removal.

7. **Mark Chore as Complete** - Input: User clicks the checkbox or toggle to mark a chore as complete. Action: Update the chore's status to "Completed." Add the assigned points/stars to the family member's total. Update the points/stars display for that member. Optionally, show a confirmation or celebratory animation.

8. **Redeem Reward** - Input: User clicks the "Redeem" button next to a reward (if they have enough points/stars). Action: Check if the user has enough points/stars. Deduct the required points/stars from the member's total. Confirm the reward redemption (e.g., show a success message). Update the points/stars display.

9. **Navigation** - Input: User clicks on navigation links or menu items (Dashboard, Family Members, Chores, Rewards). Action: Display the selected section/page. Highlight the active section in the navigation bar.

10. **General Form Actions** - Input: User cancels or closes any modal/form. Action: Close the modal/form without saving changes. Return to the previous view.

**Mock Data:** Absolutely! Here's a detailed and comprehensive set of mock data you can use for your Family Chore Manager MVP. This data will help you visualize how the app will look and function with real information.

1. **Family Members**

| ID | Name | Avatar URL (optional) | Points/Stars |
|----|------|----------------------|--------------|
| 1 | Alice | /avatars/alice.png | 12 |
| 2 | Bob | /avatars/bob.png | 8 |
| 3 | Charlie | /avatars/charlie.png | 15 |
| 4 | Dana | /avatars/dana.png | 5 |

2. **Chores**

| ID | Name | Assigned To | Due Date | Status | Points/Stars |
|----|------|-------------|----------|--------|--------------|
| 1 | Take out trash | Alice | 2025-08-18 | Completed | 2 |
| 2 | Wash dishes | Bob | 2025-08-18 | Pending | 3 |
| 3 | Vacuum living room | Charlie | 2025-08-19 | Pending | 4 |
| 4 | Feed the dog | Dana | 2025-08-18 | Completed | 1 |
| 5 | Water the plants | Alice | 2025-08-19 | Pending | 2 |
| 6 | Do homework | Charlie | 2025-08-18 | Completed | 3 |

3. **Rewards**

| ID | Name | Required Points/Stars | Description |
|----|------|----------------------|-------------|
| 1 | $5 Allowance | 10 | Cash reward for chores |
| 2 | Movie Night | 15 | Family movie with popcorn |
| 3 | Extra Screen Time | 5 | 30 extra minutes of screen |
| 4 | Choose Dinner | 8 | Pick what's for dinner |

4. **Activity Log (Optional)**

| Date | Activity |
|------|----------|
| 2025-08-18 | Alice completed "Take out trash" (+2 stars) |
| 2025-08-18 | Dana completed "Feed the dog" (+1 star) |
| 2025-08-18 | Charlie completed "Do homework" (+3 stars) |
| 2025-08-18 | Bob was assigned "Wash dishes" |
| 2025-08-19 | Charlie was assigned "Vacuum living room" |

5. **Example Data in JSON Format**

```json
{
  "familyMembers": [
    { "id": 1, "name": "Alice", "avatar": "/avatars/alice.png", "points": 12 },
    { "id": 2, "name": "Bob", "avatar": "/avatars/bob.png", "points": 8 },
    { "id": 3, "name": "Charlie", "avatar": "/avatars/charlie.png", "points": 15 },
    { "id": 4, "name": "Dana", "avatar": "/avatars/dana.png", "points": 5 }
  ],
  "chores": [
    { "id": 1, "name": "Take out trash", "assignedTo": 1, "dueDate": "2025-08-18", "status": "Completed", "points": 2 },
    { "id": 2, "name": "Wash dishes", "assignedTo": 2, "dueDate": "2025-08-18", "status": "Pending", "points": 3 },
    { "id": 3, "name": "Vacuum living room", "assignedTo": 3, "dueDate": "2025-08-19", "status": "Pending", "points": 4 },
    { "id": 4, "name": "Feed the dog", "assignedTo": 4, "dueDate": "2025-08-18", "status": "Completed", "points": 1 },
    { "id": 5, "name": "Water the plants", "assignedTo": 1, "dueDate": "2025-08-19", "status": "Pending", "points": 2 },
    { "id": 6, "name": "Do homework", "assignedTo": 3, "dueDate": "2025-08-18", "status": "Completed", "points": 3 }
  ],
  "rewards": [
    { "id": 1, "name": "$5 Allowance", "requiredPoints": 10, "description": "Cash reward for chores" },
    { "id": 2, "name": "Movie Night", "requiredPoints": 15, "description": "Family movie with popcorn" },
    { "id": 3, "name": "Extra Screen Time", "requiredPoints": 5, "description": "30 extra minutes of screen" },
    { "id": 4, "name": "Choose Dinner", "requiredPoints": 8, "description": "Pick what's for dinner" }
  ]
}
```

**Known External Services or APIs Needed:** You can use API calls to openAI GPT 4o for any logic required in this application using the following endpoint: "https://api.wearables-ape.io/models/v1/chat/completions" instead of "https://api.openai.com/v1/chat/completions". If using images in prompts always use high details. Set max tokens to 2000. If audio transcription is needed in the logic of this app, use the following API call instructions: curl -X 'POST' 'https://api.wearables-ape.io/models/v1/audio/transcriptions' -H 'accept: application/json' -H 'Content-Type: multipart/form-data' -H 'Authorization: Bearer TOKEN' -F 'model=whisper' -F 'language=en' -F 'file=<FILE>.mp3;type=audio/mpeg' Send the file as a multipart form data, not a base64 encoded blob. Use the following API key e47d4054-d7df-4b8b-9755-6d04bb487781

**Technical Constraints:** A HTML web app with CSS and JavaScript that can be run locally. Any network accessible resource or API can be used.

**Machine used to run this app:** I'm using a Macbook and Google Chrome, both updated to the latest version

**Debuggability:** The application should be highly debuggable. Add console logs extensively for every step of the user flows and every step of the application loading or logic.

**Documentation:** Create a fully detailed README.md that covers the full solution, so that the project and code base is always easily understandable to both humans and AI Agents. You need to inlude a section called "Original Prompt" that includes this full prompt without any edits, as it will serve as a reference for the prompt that originally created the baseline of the code base.

**Security and privacy:** You can completely ignore security and privacy risks as this application will only be run locally by the user on their secure machines. So you can store sensitive values in the front end or local storage without worries.

As reminder, your task is to think of the right implementation, architecture, dependencies and resources needed and propose a plan. You must NOT not start coding and creating files until the user has approved your plan

---

*End of Original Prompt*

---

## Acknowledgments

Created with ❤️ using vanilla JavaScript, CSS, and HTML.

Special thanks to modern web standards that make complex applications possible without frameworks!

---

**Happy Chore Managing! 🏠⭐**
