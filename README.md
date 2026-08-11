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

git clone https://github.com/YOUR_USERNAME/TodoistInteractive.git
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
git clone https://github.com/YOUR_USERNAME/TodoistInteractive.git
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
