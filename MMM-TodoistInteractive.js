Module.register("MMM-TodoistInteractive", {
	defaults: {
		// Todoist
		todoistToken: "",

		// Refresh tasks every 60 seconds
		updateInterval: 60000,

		// Maximum number of tasks to display
		maxTasks: 50,

		// Width of the module
		width: "450px",

		//View Settings
		view: "today",

		// Display settings
		showCompleted: false,
		showDueDate: true,
		showProject: true,
		showAssignee: true
	},

	start() {
		Log.info("[" + this.name + "] Starting");

		this.tasks = [];

		// Add-task state
		this.showAddTaskDialog = false;
		this.newTaskContent = "";
		this.addingTask = false;

		// Project / due-date state
		this.projects = [];
		this.selectedProjectId = "";
		this.selectedDueDate = "";

		// Task update state
		this.updatingTasks = new Set();

		// General state
		this.loading = true;
		this.error = null;
		this.configReady = false;

		this.updateTimer = null;

		this.sendSocketNotification("SET_CONFIG", {
			todoistToken: this.config.todoistToken,
			updateInterval: this.config.updateInterval
		});
	},

	getStyles() {
		return [
			this.file("css/TodoistInteractive.css")
		];
	},

	getDom() {
		const wrapper = document.createElement("div");

		wrapper.className = "todoist-interactive";

		/*
		 * Configurable module width.
		 */
		if (this.config.width) {
			wrapper.style.width = this.config.width;
		}

		/*
		 * Header
		 */
		const header = document.createElement("div");
		header.className = "todoist-header";

		const title = document.createElement("div");
		title.className = "todoist-title";
		title.textContent = "Todoist Tasks:";

		header.appendChild(title);

		const addButton = document.createElement("button");
		addButton.className = "todoist-add-button";
		addButton.type = "button";
		addButton.setAttribute(
			"aria-label",
			"Add task"
		);
		addButton.textContent = "+";

		addButton.addEventListener("click", (event) => {
			event.stopPropagation();
			this.openAddTaskDialog();
		});

		header.appendChild(addButton);
		wrapper.appendChild(header);

		/*
		 * Add-task dialog
		 */
		if (this.showAddTaskDialog) {
			wrapper.appendChild(
				this.createAddTaskDialog()
			);
		}

		/*
		 * Loading state
		 */
		if (this.loading) {
			const loading = document.createElement("div");

			loading.className = "todoist-status";
			loading.textContent = "Loading...";

			wrapper.appendChild(loading);

			return wrapper;
		}

		/*
		 * Error state
		 */
		if (this.error) {
			const error = document.createElement("div");

			error.className = "todoist-error";
			error.textContent = this.error;

			wrapper.appendChild(error);

			return wrapper;
		}

/*
		 * "all" uses the grouped layout.
		 * All other views use a normal task list.
		 */
		if (
			this.config.view === "all" ||
			this.config.view === "today-tomorrow"
		) {
			const groups = this.groupTasks();

			let remainingTasks =
				Number(this.config.maxTasks);

			if (
				!Number.isFinite(remainingTasks) ||
				remainingTasks <= 0
			) {
				remainingTasks = 50;
			}

			let sectionOrder;
			
			if (this.config.view === "today-tomorrow") {
				sectionOrder = [
					{
						key: "today",
						title: "Due Today"
					},
					{
						key: "tomorrow",
						title: "Due Tomorrow"
					}
				];
			} else {
				sectionOrder = [
					{
						key: "overdue",
						title: "Overdue"
					},
					{
						key: "today",
						title: "Due Today"
					},
					{
						key: "tomorrow",
						title: "Due Tomorrow"
					},
					{
						key: "upcoming",
						title: "Upcoming"
					},
					{
						key: "noDueDate",
						title: "No Due Date"
					}
				];
			}

			sectionOrder.forEach((section) => {
				if (remainingTasks <= 0) {
					return;
				}

				const sectionTasks =
					groups[section.key] || [];

				if (sectionTasks.length === 0) {
					return;
				}

				const sectionElement =
					document.createElement("div");

				sectionElement.className =
					"todoist-section";

				const sectionHeader =
					document.createElement("div");

				sectionHeader.className =
					"todoist-section-header";

				sectionHeader.textContent =
					section.title;

				sectionElement.appendChild(
					sectionHeader
				);

				const taskList =
					document.createElement("div");

				taskList.className =
					"todoist-task-list";

				const tasksToShow =
					sectionTasks.slice(
						0,
						remainingTasks
					);

				tasksToShow.forEach((task) => {
					taskList.appendChild(
						this.createTaskElement(task)
					);
				});

				remainingTasks -=
					tasksToShow.length;

				sectionElement.appendChild(
					taskList
				);

				wrapper.appendChild(
					sectionElement
				);
			});
		} else {
			/*
			 * Today / today-tomorrow / upcoming
			 * use the normal task-list layout.
			 */
			const taskList =
				document.createElement("div");

			taskList.className =
				"todoist-task-list";

			this.tasks
				.slice(0, this.config.maxTasks)
				.forEach((task) => {
					taskList.appendChild(
						this.createTaskElement(task)
					);
				});

			wrapper.appendChild(taskList);
		}

		/*
		 * Keep the display within maxTasks.
		 */
		let remainingTasks = Number(this.config.maxTasks);

		if (
			!Number.isFinite(remainingTasks) ||
			remainingTasks <= 0
		) {
			remainingTasks = 50;
		}

		/*
		 * Section order is intentional.
		 */
		const sectionOrder = [
			{
				key: "overdue",
				title: "Overdue"
			},
			{
				key: "today",
				title: "Due Today"
			},
			{
				key: "tomorrow",
				title: "Due Tomorrow"
			},
			{
				key: "upcoming",
				title: "Upcoming"
			},
			{
				key: "noDueDate",
				title: "No Due Date"
			}
		];

		sectionOrder.forEach((section) => {
			if (remainingTasks <= 0) {
				return;
			}

			const sectionTasks =
				groups[section.key] || [];

			if (sectionTasks.length === 0) {
				return;
			}

			const sectionElement =
				document.createElement("div");

			sectionElement.className =
				"todoist-section";

			/*
			 * Section heading.
			 */
			const sectionHeader =
				document.createElement("div");

			sectionHeader.className =
				"todoist-section-header";

			sectionHeader.textContent =
				section.title;

			sectionElement.appendChild(
				sectionHeader
			);

			/*
			 * Section task list.
			 */
			const taskList =
				document.createElement("div");

			taskList.className =
				"todoist-task-list";

			const tasksToShow =
				sectionTasks.slice(
					0,
					remainingTasks
				);

			tasksToShow.forEach((task) => {
				taskList.appendChild(
					this.createTaskElement(task)
				);
			});

			remainingTasks -=
				tasksToShow.length;

			sectionElement.appendChild(
				taskList
			);

			wrapper.appendChild(
				sectionElement
			);
		});

		return wrapper;
	},

	/*
	 * Group tasks into:
	 *
	 * Overdue
	 * Due Today
	 * Due Tomorrow
	 * Upcoming
	 * No Due Date
	 */
	groupTasks() {
		const groups = {
			overdue: [],
			today: [],
			tomorrow: [],
			upcoming: [],
			noDueDate: []
		};

		const today =
			this.getLocalDateString(0);

		const tomorrow =
			this.getLocalDateString(1);

		this.tasks.forEach((task) => {
			const dueDate =
				this.getTaskDate(task);

			if (!dueDate) {
				groups.noDueDate.push(task);
				return;
			}

			if (dueDate < today) {
				groups.overdue.push(task);
				return;
			}

			if (dueDate === today) {
				groups.today.push(task);
				return;
			}

			if (dueDate === tomorrow) {
				groups.tomorrow.push(task);
				return;
			}

			if (dueDate > tomorrow) {
				groups.upcoming.push(task);
				return;
			}

			groups.noDueDate.push(task);
		});

		/*
		 * Sort dated sections chronologically.
		 */
		groups.overdue.sort(
			(a, b) =>
				this.getTaskDate(a).localeCompare(
					this.getTaskDate(b)
				)
		);

		groups.upcoming.sort(
			(a, b) =>
				this.getTaskDate(a).localeCompare(
					this.getTaskDate(b)
				)
		);

		return groups;
	},

	/*
	 * Get YYYY-MM-DD from a Todoist task.
	 */
	getTaskDate(task) {
		if (!task || !task.due) {
			return null;
		}

		/*
		 * Todoist normally supplies due.date.
		 */
		if (
			typeof task.due.date === "string" &&
			task.due.date.length >= 10
		) {
			return task.due.date.substring(0, 10);
		}

		/*
		 * Fall back to due.datetime.
		 */
		if (
			typeof task.due.datetime === "string" &&
			task.due.datetime.length >= 10
		) {
			return task.due.datetime.substring(0, 10);
		}

		return null;
	},

	/*
	 * Return today's date or a future date as
	 * YYYY-MM-DD using the MagicMirror's local time.
	 */
	getLocalDateString(daysFromToday) {
		const date = new Date();

		date.setHours(12, 0, 0, 0);

		date.setDate(
			date.getDate() + daysFromToday
		);

		const year = date.getFullYear();

		const month = String(
			date.getMonth() + 1
		).padStart(2, "0");

		const day = String(
			date.getDate()
		).padStart(2, "0");

		return (
			year +
			"-" +
			month +
			"-" +
			day
		);
	},

	/*
	 * Open the Add Task dialog.
	 */
	openAddTaskDialog() {
		this.showAddTaskDialog = true;
		this.newTaskContent = "";
		this.addingTask = false;

		this.selectedProjectId = "";
		this.selectedDueDate = "";

		this.sendSocketNotification(
			"GET_PROJECTS"
		);

		this.updateDom(200);

		setTimeout(() => {
			const input =
				document.querySelector(
					".todoist-add-task-input"
				);

			if (input) {
				input.focus();
			}
		}, 250);
	},

	/*
	 * Build Add Task dialog.
	 */
	createAddTaskDialog() {
		const dialog =
			document.createElement("div");

		dialog.className =
			"todoist-add-dialog";

		const title =
			document.createElement("div");

		title.className =
			"todoist-add-dialog-title";

		title.textContent = "Add Task";

		dialog.appendChild(title);

		/*
		 * Task name.
		 */
		const input =
			document.createElement("input");

		input.className =
			"todoist-add-task-input";

		input.type = "text";
		input.placeholder =
			"What needs to be done?";
		input.value =
			this.newTaskContent;

		input.addEventListener(
			"input",
			(event) => {
				this.newTaskContent =
					event.target.value;
			}
		);

		input.addEventListener(
			"keydown",
			(event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.submitNewTask();
				}

				if (event.key === "Escape") {
					event.preventDefault();
					this.closeAddTaskDialog();
				}
			}
		);

		dialog.appendChild(input);

		/*
		 * Project selector.
		 */
		const projectRow =
			document.createElement("div");

		projectRow.className =
			"todoist-add-field";

		const projectLabel =
			document.createElement("label");

		projectLabel.className =
			"todoist-add-label";

		projectLabel.textContent =
			"Project";

		projectRow.appendChild(
			projectLabel
		);

		const projectSelect =
			document.createElement("select");

		projectSelect.className =
			"todoist-add-select";

		const inboxOption =
			document.createElement("option");

		inboxOption.value = "";
		inboxOption.textContent =
			"Inbox";

		projectSelect.appendChild(
			inboxOption
		);

		this.projects.forEach(
			(project) => {
				const option =
					document.createElement(
						"option"
					);

				option.value =
					String(project.id);

				option.textContent =
					project.name;

				if (
					String(project.id) ===
					String(
						this.selectedProjectId
					)
				) {
					option.selected = true;
				}

				projectSelect.appendChild(
					option
				);
			}
		);

		projectSelect.value =
			this.selectedProjectId;

		projectSelect.addEventListener(
			"change",
			(event) => {
				this.selectedProjectId =
					event.target.value;
			}
		);

		projectRow.appendChild(
			projectSelect
		);

		dialog.appendChild(projectRow);

		/*
		 * Due date selector.
		 */
		const dueRow =
			document.createElement("div");

		dueRow.className =
			"todoist-add-field";

		const dueLabel =
			document.createElement("label");

		dueLabel.className =
			"todoist-add-label";

		dueLabel.textContent =
			"Due date";

		dueRow.appendChild(
			dueLabel
		);

		const dueSelect =
			document.createElement("select");

		dueSelect.className =
			"todoist-add-select";

		const dueOptions = [
			{
				value: "",
				label: "No due date"
			},
			{
				value: "today",
				label: "Today"
			},
			{
				value: "tomorrow",
				label: "Tomorrow"
			},
			{
				value: "next monday",
				label: "Next Monday"
			},
			{
				value: "next week",
				label: "Next week"
			}
		];

		dueOptions.forEach(
			(dueOption) => {
				const option =
					document.createElement(
						"option"
					);

				option.value =
					dueOption.value;

				option.textContent =
					dueOption.label;

				if (
					dueOption.value ===
					this.selectedDueDate
				) {
					option.selected = true;
				}

				dueSelect.appendChild(
					option
				);
			}
		);

		dueSelect.value =
			this.selectedDueDate;

		dueSelect.addEventListener(
			"change",
			(event) => {
				this.selectedDueDate =
					event.target.value;
			}
		);

		dueRow.appendChild(
			dueSelect
		);

		dialog.appendChild(dueRow);

		/*
		 * Buttons.
		 */
		const buttons =
			document.createElement("div");

		buttons.className =
			"todoist-add-dialog-buttons";

		const cancelButton =
			document.createElement("button");

		cancelButton.className =
			"todoist-dialog-button " +
			"todoist-cancel-button";

		cancelButton.type = "button";
		cancelButton.textContent =
			"Cancel";

		cancelButton.addEventListener(
			"click",
			() => {
				this.closeAddTaskDialog();
			}
		);

		buttons.appendChild(
			cancelButton
		);

		const addButton =
			document.createElement("button");

		addButton.className =
			"todoist-dialog-button " +
			"todoist-confirm-button";

		addButton.type = "button";

		addButton.textContent =
			this.addingTask
				? "Adding..."
				: "Add";

		addButton.disabled =
			this.addingTask ||
			!this.newTaskContent.trim();

		addButton.addEventListener(
			"click",
			() => {
				this.submitNewTask();
			}
		);

		buttons.appendChild(
			addButton
		);

		dialog.appendChild(buttons);

		return dialog;
	},

	/*
	 * Submit a new task.
	 */
	submitNewTask() {
		const content =
			this.newTaskContent.trim();

		if (
			!content ||
			this.addingTask
		) {
			return;
		}

		this.addingTask = true;

		this.updateDom(100);

		this.sendSocketNotification(
			"ADD_TASK",
			{
				content: content,
				projectId:
					this.selectedProjectId ||
					null,
				dueString:
					this.selectedDueDate ||
					null
			}
		);
	},

	/*
	 * Close Add Task dialog.
	 */
	closeAddTaskDialog() {
		if (this.addingTask) {
			return;
		}

		this.showAddTaskDialog = false;
		this.newTaskContent = "";

		this.selectedProjectId = "";
		this.selectedDueDate = "";

		this.updateDom(200);
	},

	/*
	 * Create an individual task.
	 */
	createTaskElement(task) {
		const taskElement =
			document.createElement("div");

		taskElement.className =
			"todoist-task";

		if (task.completed) {
			taskElement.classList.add(
				"completed"
			);
		}

		/*
		 * Checkbox.
		 */
		const checkbox =
			document.createElement("button");

		checkbox.className =
			"todoist-checkbox";

		checkbox.type = "button";

		checkbox.setAttribute(
			"aria-label",
			task.completed
				? "Reopen task"
				: "Complete task"
		);

		checkbox.textContent =
			task.completed
				? "✓"
				: "";

		if (
			this.updatingTasks.has(
				String(task.id)
			)
		) {
			checkbox.classList.add(
				"updating"
			);

			checkbox.disabled = true;
			checkbox.textContent = "…";
		}

		checkbox.addEventListener(
			"click",
			(event) => {
				event.stopPropagation();
				this.toggleTask(task);
			}
		);

		taskElement.appendChild(
			checkbox
		);

		/*
		 * Main task content.
		 */
		const content =
			document.createElement("div");

		content.className =
			"todoist-task-content";

		const taskRow =
			document.createElement("div");

		taskRow.className =
			"todoist-task-row";

		const taskText =
			document.createElement("div");

		taskText.className =
			"todoist-task-text";

		taskText.textContent =
			task.content || "";

		taskRow.appendChild(
			taskText
		);

		/*
		 * Assignee.
		 *
		 * The helper may provide assigneeName,
		 * or the task may already contain an
		 * assignee object/name.
		 */
		if (this.config.showAssignee) {
			const assignee =
				this.getAssigneeName(task);

			if (assignee) {
				const assigneeElement =
					document.createElement(
						"div"
					);

				assigneeElement.className =
					"todoist-assignee";

				assigneeElement.textContent =
					assignee;

				taskRow.appendChild(
					assigneeElement
				);
			}
		}

		content.appendChild(
			taskRow
		);

		/*
		 * Metadata.
		 */
		const metadata =
			document.createElement("div");

		metadata.className =
			"todoist-task-meta";

		if (
			this.config.showDueDate &&
			task.due
		) {
			const due =
				document.createElement("span");

			due.className =
				"todoist-due";

			due.textContent =
				this.getDueLabel(task);

			if (
				this.getTaskDate(task) <
				this.getLocalDateString(0)
			) {
				due.classList.add(
					"todoist-due-overdue"
				);
			}

			metadata.appendChild(due);
		}

		if (
			this.config.showProject &&
			task.projectName
		) {
			const project =
				document.createElement("span");

			project.className =
				"todoist-project";

			project.textContent =
				task.projectName;

			metadata.appendChild(
				project
			);
		}

		if (
			metadata.childNodes.length > 0
		) {
			content.appendChild(
				metadata
			);
		}

		taskElement.appendChild(
			content
		);

		/*
		 * Clicking the task itself.
		 */
		taskElement.addEventListener(
			"click",
			() => {
				this.selectTask(task);
			}
		);

		return taskElement;
	},

	/*
	 * Find the assignee name from the
	 * different forms the API/helper may use.
	 */
	getAssigneeName(task) {
		if (!task) {
			return "";
		}

		if (
			typeof task.assigneeName ===
			"string"
		) {
			return task.assigneeName;
		}

		if (
			task.assignee &&
			typeof task.assignee.name ===
				"string"
		) {
			return task.assignee.name;
		}

		if (
			typeof task.assignee ===
			"string"
		) {
			return task.assignee;
		}

		if (
			typeof task.assignee_name ===
			"string"
		) {
			return task.assignee_name;
		}

		return "";
	},

	/*
	 * Get a friendly due-date label.
	 */
	getDueLabel(task) {
		const date =
			this.getTaskDate(task);

		if (!date) {
			return "";
		}

		const today =
			this.getLocalDateString(0);

		const tomorrow =
			this.getLocalDateString(1);

		if (date < today) {
			return "Overdue";
		}

		if (date === today) {
			return "Today";
		}

		if (date === tomorrow) {
			return "Tomorrow";
		}

		return date;
	},

	/*
	 * Complete or reopen a task.
	 */
	toggleTask(task) {
		if (!task || !task.id) {
			return;
		}

		const taskId =
			String(task.id);

		if (
			this.updatingTasks.has(taskId)
		) {
			return;
		}

		this.updatingTasks.add(
			taskId
		);

		this.updateDom(0);

		this.sendSocketNotification(
			"TOGGLE_TASK",
			{
				taskId: taskId,
				completed:
					!task.completed
			}
		);
	},

	/*
	 * Called when a task itself is clicked.
	 */
	selectTask(task) {
		Log.info(
			"[" +
			this.name +
			"] Task selected: " +
			task.id
		);

		this.sendNotification(
			"TODOIST_TASK_SELECTED",
			task
		);
	},

	/*
	 * Receive messages from node_helper.js.
	 */
	socketNotificationReceived(
		notification,
		payload
	) {
		Log.info(
			"[" +
			this.name +
			"] Socket notification: " +
			notification
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
				this.handleTaskUpdated(
					payload
				);
				break;

			case "TASK_ADDED":
				this.handleTaskAdded(
					payload
				);
				break;

			case "PROJECTS":
				this.handleProjects(
					payload
				);
				break;

			case "TODOIST_ERROR":
				this.handleError(
					payload
				);
				break;

			default:
				break;
		}
	},

	/*
	 * Handle successfully created task.
	 */
	handleTaskAdded() {
		this.addingTask = false;
		this.showAddTaskDialog = false;

		this.newTaskContent = "";
		this.selectedProjectId = "";
		this.selectedDueDate = "";

		this.updateDom(200);

		setTimeout(() => {
			this.requestTasks();
		}, 300);
	},

	/*
	 * Ask node_helper for all active tasks.
	 */
	requestTasks() {
		if (!this.configReady) {
			return;
		}

		this.loading = true;
		this.error = null;

		this.updateDom();

		/*
		 * We need ALL active tasks so the front end
		 * can build the five due-date sections.
		 */
		this.sendSocketNotification(
			"GET_TASKS",
			{
				view: "all",
				showCompleted:
					this.config.showCompleted
			}
		);
	},

	/*
	 * Process tasks from Todoist.
	 */
	handleTasks(payload) {
		this.loading = false;
		this.error = null;

		if (Array.isArray(payload)) {
			this.tasks = payload;
		} else if (
			payload &&
			Array.isArray(payload.tasks)
		) {
			this.tasks = payload.tasks;
		} else {
			this.tasks = [];
		}

		this.updateDom(300);
	},

	/*
	 * Process completed/reopened task.
	 */
	handleTaskUpdated(payload) {
		if (
			!payload ||
			!payload.taskId
		) {
			return;
		}

		const taskId =
			String(payload.taskId);

		this.updatingTasks.delete(
			taskId
		);

		const task =
			this.tasks.find(
				(item) =>
					String(item.id) ===
					taskId
			);

		if (task) {
			task.completed =
				Boolean(
					payload.completed
				);
		}

		this.updateDom(200);

		setTimeout(() => {
			this.requestTasks();
		}, 500);
	},

	/*
	 * Process projects.
	 */
	handleProjects(payload) {
		if (Array.isArray(payload)) {
			this.projects = payload;
		} else if (
			payload &&
			Array.isArray(payload.projects)
		) {
			this.projects =
				payload.projects;
		} else {
			this.projects = [];
		}

		this.updateDom(100);
	},

	/*
	 * Handle API/network errors.
	 */
	handleError(payload) {
		this.loading = false;
		this.addingTask = false;

		if (
			typeof payload ===
			"string"
		) {
			this.error = payload;
		} else if (
			payload &&
			payload.message
		) {
			this.error =
				payload.message;
		} else {
			this.error =
				"Unable to connect to Todoist";
		}

		this.updateDom();
	},

	/*
	 * Automatically refresh tasks.
	 */
	scheduleUpdates() {
		if (this.updateTimer) {
			clearInterval(
				this.updateTimer
			);
		}

		this.updateTimer =
			setInterval(
				() => {
					this.requestTasks();
				},
				this.config.updateInterval
			);
	},

	/*
	 * MagicMirror lifecycle hook.
	 */
	notificationReceived(
		notification
	) {
		if (
			notification ===
			"ALL_MODULES_STARTED"
		) {
			this.scheduleUpdates();
		}
	},

	/*
	 * Stop our timer.
	 */
	stop() {
		if (this.updateTimer) {
			clearInterval(
				this.updateTimer
			);

			this.updateTimer = null;
		}

		Log.info(
			"[" +
			this.name +
			"] Stopped"
		);
	}
});

