# MMM-TodoistInteractive

An interactive Todoist module for [MagicMirror²](https://magicmirror.builders/).

Display your Todoist tasks directly on your MagicMirror with a clean, compact interface. Tasks can be completed directly from the mirror, new tasks can be added, and tasks can be filtered by Todoist list/project.

## Features

* 📋 Display Todoist tasks directly on MagicMirror
* ✅ Complete and reopen tasks directly from the mirror
* ➕ Add new Todoist tasks
* 📅 Add due dates when creating tasks
* 📁 Select a Todoist project/list when creating tasks
* 🔎 Filter displayed tasks by Todoist list/project
* 📆 Multiple task views:

  * Today
  * Today + Tomorrow
  * All
* 🚨 Automatically separates overdue tasks
* 📅 Groups tasks into:

  * Overdue
  * Due Today
  * Due Tomorrow
  * Upcoming
  * No Due Date
* 👤 Display task assignees
* 📁 Display task projects
* 🔄 Automatically refresh Todoist tasks
* 📏 Configurable module width
* 🖥️ Designed specifically for MagicMirror displays
* 🧩 Multiple instances can be placed on the same MagicMirror

## Screenshots

Screenshots coming soon.

The recommended screenshots will demonstrate:

### Main Task View

Show the module displaying:

* Overdue
* Due Today
* Due Tomorrow
* Upcoming
* No Due Date

Example:

```text
Todoist Tasks!       [All Lists ▼]       +

Overdue
────────────────────────────────────────
○ Call Bob          Work · Yesterday · John
○ Finish proposal   Work · Yesterday · Sarah

Due Today
────────────────────────────────────────
○ Send invoice      Work · Today · John
○ Review contract   Work · Today · Sarah

Due Tomorrow
────────────────────────────────────────
○ Prepare slides    Work · Tomorrow · John
```

### Adding a Task

Show the Add Task interface with:

* Task name
* Due date
* Project/list selection
* Add/Cancel controls

### List Filtering

Show the list selector with several Todoist projects/lists available.

Example:

```text
[All Lists ▼]
 ├─ All Lists
 ├─ Work
 ├─ Personal
 ├─ Home
 └─ Projects
```

## Installation

Navigate to your MagicMirror modules directory:

```bash
cd ~/MagicMirror/modules
```

Clone the repository:

```bash
git clone https://github.com/theTapp-astro/MMM-TodoistInteractive.git
```

Enter the module directory:

```bash
cd MMM-TodoistInteractive
```

Install dependencies:

```bash
npm install
```

## Todoist API Token

This module requires a Todoist API token.

You can obtain your Todoist API token from your Todoist account settings.

Keep your API token private. Do not commit it to GitHub.

Your MagicMirror configuration should contain the token locally, rather than storing it in the repository.

## Configuration

Add the module to your MagicMirror `config.js`:

```javascript
{
	module: "MMM-TodoistInteractive",
	position: "top_right",

	config: {
		todoistToken: "YOUR_TODOIST_API_TOKEN",

		updateInterval: 60000,

		width: "450px",

		maxTasks: 20,

		showCompleted: false,

		showDueDate: true,

		showProject: true,

		showAssignee: true,

		view: "all",

		list: "all"
	}
},
```

## Configuration Options

| Option           | Default   | Description                                    |
| ---------------- | --------- | ---------------------------------------------- |
| `todoistToken`   | required  | Your Todoist API token                         |
| `updateInterval` | `60000`   | How often tasks are refreshed, in milliseconds |
| `width`          | `"450px"` | Width of the module                            |
| `maxTasks`       | `20`      | Maximum number of tasks displayed              |
| `showCompleted`  | `false`   | Display completed tasks                        |
| `showDueDate`    | `true`    | Display task due dates                         |
| `showProject`    | `true`    | Display the Todoist project/list               |
| `showAssignee`   | `true`    | Display the task assignee                      |
| `view`           | `"all"`   | Default task view                              |
| `list`           | `"all"`   | Default Todoist list/project filter            |

## Views

### Today

Displays tasks due today.

```javascript
view: "today"
```

### Today + Tomorrow

Displays today's and tomorrow's tasks.

```javascript
view: "today-tomorrow"
```

### All

Displays tasks grouped by due date:

```javascript
view: "all"
```

The All view organizes tasks into:

1. Overdue
2. Due Today
3. Due Tomorrow
4. Upcoming
5. No Due Date

## List Filtering

You can configure a default Todoist list/project:

```javascript
list: "Work"
```

Or show tasks from all lists:

```javascript
list: "all"
```

The list selector on the mirror can then be used to change the active filter interactively.

For example:

```text
Todoist Tasks!       [Work ▼]       +
```

Changing the selection immediately filters the displayed tasks.

## Adding Tasks

Click the `+` button to open the Add Task interface.

A new task can include:

* Task name
* Due date
* Todoist project/list

The task is created directly in Todoist.

## Completing Tasks

Click the circle next to a task to complete it.

Completed tasks can be reopened by clicking the completion indicator again.

## Refresh Interval

The default refresh interval is:

```javascript
updateInterval: 60000
```

This equals **60 seconds**.

Examples:

### 30 seconds

```javascript
updateInterval: 30000
```

### 5 minutes

```javascript
updateInterval: 300000
```

Task changes made directly through the module are refreshed immediately.

## Multiple Instances

Multiple instances of `MMM-TodoistInteractive` can be added to the same MagicMirror.

For example, you could create a Work task display:

```javascript
{
	module: "MMM-TodoistInteractive",
	position: "top_left",

	config: {
		todoistToken: "YOUR_TODOIST_API_TOKEN",

		width: "400px",

		view: "today",

		list: "Work"
	}
},
```

and a Personal task display:

```javascript
{
	module: "MMM-TodoistInteractive",
	position: "top_right",

	config: {
		todoistToken: "YOUR_TODOIST_API_TOKEN",

		width: "400px",

		view: "all",

		list: "Personal"
	}
},
```

> **Note:** Multiple-instance support is intended for instances using the same Todoist account. Instance-specific handling of node-helper state may be expanded as the module develops.

## Layout

The module is designed to remain compact on a MagicMirror display.

Tasks are displayed on a single line where possible:

```text
○ Task name        Project · Due Date · Assignee
```

The visual hierarchy is intentionally subtle:

* Task name — bright
* Section headings — bold and prominent
* Due date — moderately bright
* Project — subdued
* Assignee — subdued

Sections are separated by thin horizontal lines.

## Development

This project is being developed specifically for MagicMirror².

Repository:

https://github.com/theTapp-astro/MMM-TodoistInteractive

Clone the repository and make changes locally:

```bash
git clone https://github.com/theTapp-astro/MMM-TodoistInteractive.git
```

After making changes:

```bash
git add .
git commit -m "Describe your change"
git push
```

Then update the module on the MagicMirror:

```bash
cd ~/MagicMirror/modules/MMM-TodoistInteractive
git pull
```

Restart MagicMirror after updating.

## Troubleshooting

### Module does not appear

Check that the module directory is exactly:

```text
modules/MMM-TodoistInteractive/
```

and that the main file is:

```text
MMM-TodoistInteractive.js
```

The module must be registered as:

```javascript
Module.register("MMM-TodoistInteractive", {
```

### Node helper starts but tasks do not appear

Check the MagicMirror log for:

```text
[MMM-TodoistInteractive] Node helper started
```

Then check the Chromium developer console for JavaScript errors.

### Todoist tasks do not update

Verify:

* Your Todoist API token is correct.
* MagicMirror has internet access.
* `updateInterval` is configured correctly.
* The selected list/project still exists in Todoist.

### API token security

Never commit your Todoist API token to GitHub.

If a token is accidentally committed to a public repository, revoke it through Todoist and generate a new one.

## Roadmap

Potential future improvements include:

* [ ] Interactive View selector
* [ ] Better multi-instance isolation
* [ ] Task editing
* [ ] Task deletion
* [ ] Drag-and-drop task ordering
* [ ] Priority indicators
* [ ] Labels
* [ ] Sections
* [ ] Subtasks
* [ ] Recurring task support
* [ ] More configurable styling
* [ ] Optional compact mode
* [ ] Touch-friendly controls
* [ ] Additional Todoist filters

## License

MIT License

Copyright © 2026 theTapp-astro

```
```
# TodoistInteractive

An interactive [MagicMirror²](https://magicmirror.builders/) module for [Todoist](https://todoist.com/) that lets you view and manage your tasks directly from your smart mirror.

> **Status:** Early development

## Features

TodoistInteractive is being designed as a touch-friendly Todoist interface for MagicMirror².

### Current

* Display Todoist tasks
* Display task due dates
* Display project names
* Display task completion state
* Automatic task refresh
* Touch-friendly task controls
* Complete and reopen tasks
* Todoist API integration

### Planned

* Add new tasks
* Edit existing tasks
* Delete tasks
* Change task priority
* Change due dates
* Project filtering
* Label filtering
* Today view
* Upcoming view
* All active tasks view
* Task details
* Touch-friendly task creation
* Optional keyboard interaction
* MagicMirror notification support
* Better error and connection handling
* Configurable themes and display options

---

## Screenshots

Screenshots will be added as the user interface develops.

### Main Task View

<!-- SCREENSHOT REMINDER:
     Add a screenshot showing TodoistInteractive displaying
     a normal list of Todoist tasks on a MagicMirror.
     Suggested filename: docs/images/task-list.png
-->

![TodoistInteractive task list](docs/images/task-list.png)

### Completing a Task

<!-- SCREENSHOT REMINDER:
     Add a screenshot showing the interactive checkbox
     before and after completing a task.
     Suggested filename: docs/images/complete-task.png
-->

![Completing a Todoist task](docs/images/complete-task.png)

### Adding a Task

<!-- SCREENSHOT REMINDER:
     Add a screenshot showing the task creation interface.
     Suggested filename: docs/images/add-task.png
-->

![Adding a Todoist task](docs/images/add-task.png)

### Project / Due Date Display

<!-- SCREENSHOT REMINDER:
     Add a screenshot showing task metadata including
     project name and due date.
     Suggested filename: docs/images/task-metadata.png
-->

![Todoist task metadata](docs/images/task-metadata.png)

> **Screenshot reminder:** Create the `docs/images/` directory before adding the images.

---

## Installation

Clone the repository into the MagicMirror modules directory:

```bash
cd ~/MagicMirror/modules

git clone https://github.com/theTapp-astro/MMM-TodoistInteractive.git
```

Enter the module directory:

```bash
cd TodoistInteractive
```

Install dependencies:

```bash
npm install
```

> At the moment, TodoistInteractive intentionally has no external npm dependencies. Running `npm install` is still recommended so the installation process remains consistent as the module evolves.

---

## Configuration

Add TodoistInteractive to your MagicMirror configuration:

```javascript
{
	module: "TodoistInteractive",
	position: "top_right",

	config: {
		todoistToken: "YOUR_TODOIST_API_TOKEN",

		updateInterval: 60000,

		maxTasks: 20,

		showCompleted: false,

		showDueDate: true,

		showProject: true,

		view: "today"
	}
}
```

Your MagicMirror configuration normally lives at:

```text
~/MagicMirror/config/config.js
```

### Configuration Options

| Option           |   Default | Description                           |
| ---------------- | --------: | ------------------------------------- |
| `todoistToken`   |      `""` | Todoist API token                     |
| `updateInterval` |   `60000` | Refresh interval in milliseconds      |
| `maxTasks`       |      `20` | Maximum number of tasks displayed     |
| `showCompleted`  |   `false` | Whether completed tasks are displayed |
| `showDueDate`    |    `true` | Display task due dates                |
| `showProject`    |    `true` | Display project names                 |
| `view`           | `"today"` | Initial Todoist task view             |

---

## Getting Your Todoist API Token

Todoist provides a personal API token through your account's developer/integration settings.

Copy the token and add it to your MagicMirror configuration:

```javascript
config: {
	todoistToken: "YOUR_TODOIST_API_TOKEN"
}
```

### Security

**Never commit your Todoist API token to GitHub.**

The token should only exist in your local MagicMirror configuration or another local secret-management mechanism.

The repository's `.gitignore` is configured to help prevent accidentally committing local configuration and environment files.

If a Todoist API token is accidentally published, revoke it immediately and generate a new one.

---

## How It Works

TodoistInteractive separates the MagicMirror user interface from the Todoist API communication.

```text
┌─────────────────────────────────┐
│          MagicMirror            │
│                                 │
│     TodoistInteractive.js       │
│          User Interface         │
└───────────────┬─────────────────┘
                │
                │ MagicMirror
                │ socket notifications
                ▼
┌─────────────────────────────────┐
│          node_helper.js         │
│                                 │
│       Todoist API Client        │
└───────────────┬─────────────────┘
                │
                │ HTTPS
                ▼
┌─────────────────────────────────┐
│             Todoist             │
│             API v1              │
└─────────────────────────────────┘
```

The browser-side module handles the display and user interaction.

The Node.js helper handles communication with Todoist.

This separation allows the module to keep API functionality out of the presentation layer and makes future features easier to implement.

---

## Current API Operations

TodoistInteractive currently uses Todoist's API to:

* Retrieve active tasks
* Retrieve filtered tasks
* Retrieve projects
* Complete tasks
* Reopen tasks

The module uses Todoist's REST API directly rather than depending on a third-party Todoist Node.js package.

---

## Development

Clone the repository:

```bash
git clone https://github.com/theTapp-astro/TodoistInteractive.git
cd TodoistInteractive
```

Install dependencies:

```bash
npm install
```

Run the basic JavaScript syntax checks:

```bash
npm test
```

The test command currently checks:

```text
TodoistInteractive.js
node_helper.js
```

for JavaScript syntax errors.

---

## Updating the Module

When a new version is available:

```bash
cd ~/MagicMirror/modules/TodoistInteractive

git pull

npm install
```

Then restart MagicMirror.

---

## Project Structure

```text
TodoistInteractive/
├── .gitignore
├── TodoistInteractive.js
├── node_helper.js
├── package.json
├── README.md
├── LICENSE
└── css/
    └── TodoistInteractive.css
```

The project will eventually include documentation screenshots:

```text
docs/
└── images/
    ├── task-list.png
    ├── complete-task.png
    ├── add-task.png
    └── task-metadata.png
```

---

## Development Roadmap

### Phase 1 — Foundation

* [x] Create MagicMirror module
* [x] Create Node.js helper
* [x] Add Todoist API communication
* [x] Add task retrieval
* [x] Add project retrieval
* [x] Add task completion/reopening
* [x] Add basic styling
* [ ] Test against a real Todoist account

### Phase 2 — Interactive Tasks

* [ ] Complete task from mirror
* [ ] Reopen task from mirror
* [ ] Add task
* [ ] Edit task
* [ ] Delete task
* [ ] Add task confirmation
* [ ] Add error feedback
* [ ] Add loading animations

### Phase 3 — Task Organization

* [ ] Project selector
* [ ] Label selector
* [ ] Priority display
* [ ] Priority editing
* [ ] Due-date editing
* [ ] Today view
* [ ] Upcoming view
* [ ] All tasks view
* [ ] Configurable filters

### Phase 4 — Mirror Experience

* [ ] Improve touch targets
* [ ] Add touch feedback
* [ ] Add task detail view
* [ ] Add task creation dialog
* [ ] Add responsive layout
* [ ] Add configurable themes
* [ ] Add accessibility improvements

### Phase 5 — Optional Features

* [ ] Voice task creation
* [ ] MagicMirror notification integration
* [ ] External module notifications
* [ ] Advanced Todoist filters
* [ ] Offline/error recovery
* [ ] Additional Todoist features

---

## Screenshot Checklist

Before the first public release, capture screenshots of:

* [ ] Normal task list
* [ ] Empty task list
* [ ] Loading state
* [ ] API error state
* [ ] Task selected
* [ ] Task completed
* [ ] Task reopened
* [ ] Add-task interface
* [ ] Edit-task interface
* [ ] Project filtering
* [ ] Due-date display
* [ ] Priority display
* [ ] Touch interaction on the mirror

Recommended screenshot directory:

```text
docs/images/
```

Recommended image names:

```text
docs/images/task-list.png
docs/images/empty-state.png
docs/images/error-state.png
docs/images/complete-task.png
docs/images/add-task.png
docs/images/edit-task.png
docs/images/project-filter.png
docs/images/task-metadata.png
```

---

## Contributing

Issues, feature requests, and pull requests are welcome.

Before submitting a pull request:

1. Test the module on MagicMirror².
2. Run `npm test`.
3. Do not include API tokens or other secrets.
4. Update the README if the feature changes configuration or installation.
5. Include screenshots for significant UI changes.

---

## License

This project is licensed under the MIT License.

See `LICENSE` for details.

---

## Disclaimer

TodoistInteractive is an independent community project and is not affiliated with or endorsed by Todoist.

MagicMirror² is an open-source project maintained by the MagicMirror² community.
