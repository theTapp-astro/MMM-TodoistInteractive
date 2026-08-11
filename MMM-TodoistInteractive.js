Module.register("MMM-TodoistInteractive", {
	defaults: {
		// Todoist
		todoistToken: "",

		// Refresh tasks every 60 seconds
		updateInterval: 60000,

		// Number of tasks to display
		maxTasks: 20,

		// Display settings
		showCompleted: false,
		showDueDate: true,
		showProject: true,

		// Default view
		view: "today"
	},

	start() {
		Log.info(`[${this.name}] Starting`);

		this.tasks = [];
		this.showAddTaskDialog = false;
		this.newTaskContent = "";
		this.addingTask = false;
		this.updatingTasks = new Set();
		this.loading = true;
		this.error = null;
		this.lastUpdated = null;

		this.configReady = false;

		this.sendSocketNotification("SET_CONFIG", {
			todoistToken: this.config.todoistToken,
			updateInterval: this.config.updateInterval
		});

		this.updateTimer = null;
	},

	/*
	 * MagicMirror loads our CSS through this method.
	 */
	getStyles() {
		return [
			this.file("css/TodoistInteractive.css")
		];
	},

	/*
	 * Build the module's DOM.
	 */
	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "todoist-interactive";

		// Header
		const header = document.createElement("div");
		header.className = "todoist-header";

		const title = document.createElement("div");
		title.className = "todoist-title";
		title.textContent = "Todoist";

		header.appendChild(title);

		const addButton = document.createElement("button");
		addButton.className = "todoist-add-button";
		addButton.type = "button";
		addButton.setAttribute("aria-label", "Add task");
		addButton.textContent = "+";

		addButton.addEventListener("click", (event) => {
			event.stopPropagation();
			this.openAddTaskDialog();
		});

		header.appendChild(addButton);

		wrapper.appendChild(header);

		if (this.showAddTaskDialog) {
			wrapper.appendChild(this.createAddTaskDialog());
		}
		
		// Loading state
		if (this.loading) {
			const loading = document.createElement("div");
			loading.className = "todoist-status";
			loading.textContent = "Loading...";
			wrapper.appendChild(loading);

			return wrapper;
		}

		// Error state
		if (this.error) {
			const error = document.createElement("div");
			error.className = "todoist-error";
			error.textContent = this.error;
			wrapper.appendChild(error);

			return wrapper;
		}

		// Empty state
		if (!this.tasks.length) {
			const empty = document.createElement("div");
			empty.className = "todoist-empty";
			empty.textContent = "No tasks";
			wrapper.appendChild(empty);

			return wrapper;
		}

		// Task list
		const taskList = document.createElement("div");
		taskList.className = "todoist-task-list";

		this.tasks
			.slice(0, this.config.maxTasks)
			.forEach((task) => {
				taskList.appendChild(this.createTaskElement(task));
			});

		wrapper.appendChild(taskList);

		// Last updated indicator
		if (this.lastUpdated) {
			const footer = document.createElement("div");
			footer.className = "todoist-footer";

			footer.textContent =
				`Updated ${this.formatTime(this.lastUpdated)}`;

			wrapper.appendChild(footer);
		}

		return wrapper;
	},

	openAddTaskDialog() {
		this.showAddTaskDialog = true;
		this.newTaskContent = "";
		this.addingTask = false;

		this.updateDom(200);

		setTimeout(() => {
			const input = document.querySelector(
				".todoist-add-task-input"
			);

			if (input) {
				input.focus();
			}
		}, 250);
	},

		createAddTaskDialog() {
		const dialog = document.createElement("div");
		dialog.className = "todoist-add-dialog";

		const title = document.createElement("div");
		title.className = "todoist-add-dialog-title";
		title.textContent = "Add Task";

		dialog.appendChild(title);

		const input = document.createElement("input");
		input.className = "todoist-add-task-input";
		input.type = "text";
		input.placeholder = "What needs to be done?";
		input.value = this.newTaskContent;

		input.addEventListener("input", (event) => {
			this.newTaskContent = event.target.value;
		});

		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.submitNewTask();
			}

			if (event.key === "Escape") {
				event.preventDefault();
				this.closeAddTaskDialog();
			}
		});

		dialog.appendChild(input);

		const buttons = document.createElement("div");
		buttons.className = "todoist-add-dialog-buttons";

		const cancelButton = document.createElement("button");
		cancelButton.className = "todoist-dialog-button todoist-cancel-button";
		cancelButton.type = "button";
		cancelButton.textContent = "Cancel";

		cancelButton.addEventListener("click", () => {
			this.closeAddTaskDialog();
		});

		buttons.appendChild(cancelButton);

		const addButton = document.createElement("button");
		addButton.className = "todoist-dialog-button todoist-confirm-button";
		addButton.type = "button";
		addButton.textContent = this.addingTask
			? "Adding..."
			: "Add";

		addButton.disabled =
			this.addingTask || !this.newTaskContent.trim();

		addButton.addEventListener("click", () => {
			this.submitNewTask();
		});

		buttons.appendChild(addButton);

		dialog.appendChild(buttons);

		return dialog;
	},

	submitNewTask() {
		const content = this.newTaskContent.trim();

		if (!content || this.addingTask) {
			return;
		}

		this.addingTask = true;

		this.updateDom(100);

		this.sendSocketNotification("ADD_TASK", {
			content
		});
	},

	closeAddTaskDialog() {
		if (this.addingTask) {
			return;
		}

		this.showAddTaskDialog = false;
		this.newTaskContent = "";

		this.updateDom(200);
	},

	/*
	 * Create an individual task element.
	 */
	createTaskElement(task) {
		const taskElement = document.createElement("div");
		taskElement.className = "todoist-task";

		if (task.completed) {
			taskElement.classList.add("completed");
		}

		/*
		 * Checkbox
		 */
		const checkbox = document.createElement("button");
		checkbox.className = "todoist-checkbox";
		checkbox.type = "button";
		checkbox.setAttribute(
			"aria-label",
			task.completed
				? "Reopen task"
				: "Complete task"
		);

		checkbox.textContent = task.completed ? "✓" : "";
		if (this.updatingTasks.has(String(task.id))) {
			checkbox.classList.add("updating");
			checkbox.disabled = true;
			checkbox.textContent = "…";
		}

		checkbox.addEventListener("click", (event) => {
			event.stopPropagation();
			this.toggleTask(task);
		});

		taskElement.appendChild(checkbox);

		/*
		 * Task content
		 */
		const content = document.createElement("div");
		content.className = "todoist-task-content";

		const contentTop = document.createElement("div");
		contentTop.className = "todoist-task-text";
		contentTop.textContent = task.content || "";

		content.appendChild(contentTop);

		/*
		 * Metadata
		 */
		const metadata = document.createElement("div");
		metadata.className = "todoist-task-meta";

		if (this.config.showDueDate && task.due) {
			const due = document.createElement("span");
			due.className = "todoist-due";
			due.textContent = task.due.string || "";

			metadata.appendChild(due);
		}

		if (this.config.showProject && task.projectName) {
			const project = document.createElement("span");
			project.className = "todoist-project";
			project.textContent = task.projectName;

			metadata.appendChild(project);
		}

		if (metadata.childNodes.length > 0) {
			content.appendChild(metadata);
		}

		taskElement.appendChild(content);

		/*
		 * Clicking the task itself can eventually open
		 * an edit/details interface.
		 */
		taskElement.addEventListener("click", () => {
			this.selectTask(task);
		});

		return taskElement;
	},

	/*
	 * Complete or reopen a task.
	 */
	toggleTask(task) {
		if (!task || !task.id) {
			return;
		}

		const taskId = String(task.id);

		// Prevent accidental double-taps while the request is pending.
		if (this.updatingTasks.has(taskId)) {
			return;
		}

		this.updatingTasks.add(taskId);

		this.updateDom(0);

		this.sendSocketNotification("TOGGLE_TASK", {
			taskId: taskId,
			completed: !task.completed
		});
	},

	/*
	 * Called when a task itself is clicked.
	 *
	 * We'll expand this later to support:
	 * - editing
	 * - deleting
	 * - changing priority
	 * - changing due date
	 */
	selectTask(task) {
		Log.info(
			`[${this.name}] Task selected: ${task.id}`
		);

		this.sendNotification("TODOIST_TASK_SELECTED", task);
	},

	/*
	 * Receive messages from node_helper.js.
	 */
	socketNotificationReceived(notification, payload) {
		Log.info(
			`[${this.name}] Socket notification: ${notification}`
		);

		switch (notification) {
			case "CONFIG_READY":
				this.configReady = true;
				this.requestTasks();
				break;

			case "TASKS":
				this.handleTasks(payload);
				break;

			case "TASK_UPDATED":
				this.handleTaskUpdated(payload);
				break;

			case "TODOIST_ERROR":
				this.handleError(payload);
				break;

			case "TASK_ADDED":
				this.handleTaskAdded(payload);
				break;

			default:
				break;
		}
	},

	/*
	 * handle adding new task.
	 */
	handleTaskAdded(payload) {
		this.addingTask = false;
		this.showAddTaskDialog = false;
		this.newTaskContent = "";

		this.updateDom(200);

	/*
	 * Refresh from Todoist so the new task appears
	 * according to the current view/filter.
	 */
	setTimeout(() => {
		this.requestTasks();
	}, 300);
},

	/*
	 * Ask node_helper.js for the current tasks.
	 */
	requestTasks() {
		if (!this.configReady) {
			return;
		}

		this.loading = true;
		this.error = null;

		this.updateDom();

		this.sendSocketNotification("GET_TASKS", {
			view: this.config.view,
			showCompleted: this.config.showCompleted
		});
	},

	/*
	 * Process tasks received from Todoist.
	 */
	handleTasks(payload) {
		this.loading = false;
		this.error = null;

		if (Array.isArray(payload)) {
			this.tasks = payload;
		} else if (payload && Array.isArray(payload.tasks)) {
			this.tasks = payload.tasks;
		} else {
			this.tasks = [];
		}

		this.lastUpdated = new Date(Date.now());

		this.updateDom(300);
	},

	/*
	 * Process the result of completing/reopening
	 * a task.
	 */
	handleTaskUpdated(payload) {
		if (!payload || !payload.taskId) {
			return;
		}

		const taskId = String(payload.taskId);

		this.updatingTasks.delete(taskId);

		const task = this.tasks.find(
			(item) => String(item.id) === taskId
		);

		if (task) {
			task.completed = Boolean(payload.completed);
		}

		this.updateDom(200);

		/*
		 * Refresh from Todoist after the mutation so the
		 * local state stays synchronized with the server.
		 */
		setTimeout(() => {
			this.requestTasks();
		}, 500);
	},

	/*
	 * Display an API/network error.
	 */
	handleError(payload) {
		this.loading = false;

		if (typeof payload === "string") {
			this.error = payload;
		} else if (payload && payload.message) {
			this.error = payload.message;
		} else {
			this.error = "Unable to connect to Todoist";
		}

		this.updateDom();
	},

	/*
	 * Automatically refresh the task list.
	 */
	scheduleUpdates() {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
		}

		this.updateTimer = setInterval(() => {
			this.requestTasks();
		}, this.config.updateInterval);
	},

	/*
	 * MagicMirror lifecycle hook.
	 */
	notificationReceived(notification) {
		if (notification === "ALL_MODULES_STARTED") {
			this.scheduleUpdates();
		}
	},

	/*
	 * Stop our timer when MagicMirror shuts down
	 * or the module is removed.
	 */
	stop() {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}

		Log.info(`[${this.name}] Stopped`);
	},

	
	/*
	 * Format a timestamp for the footer.
	 */
	formatTime(date) {
		if (!(date instanceof Date)) {
			return "";
		}

		return date.toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit"
		});
	}
});
