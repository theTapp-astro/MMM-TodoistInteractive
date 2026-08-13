Module.register("MMM-TodoistInteractive", {
	defaults: {
		// Todoist
		todoistToken: "",

		// Refresh tasks every 60 seconds
		updateInterval: 60000,

		// Maximum number of tasks displayed
		maxTasks: 50,

		// Module width
		width: "450px",

		// Available views:
		// "today"
		// "today-tomorrow"
		// "upcoming"
		// "all"
		view: "today",

		//Name of the list from Todoist
		list: "all",

		// Display settings
		showCompleted: false,
		showDueDate: true,
		showProject: true,
		showAssignee: true
	},

	start() {
	Log.info(
		"[" + this.name + "] Starting"
	);

	this.tasks = [];
	this.projects = [];
	this.assignees = [];

	this.listFilter = this.config.list || "all";
	this.assigneeFilter = "all";

	this.loading = true;
	this.error = null;
	this.configReady = false;

	this.showAddTaskDialog = false;
	this.newTaskContent = "";
	this.addingTask = false;

	this.selectedProjectId = "";
	this.selectedDueDate = "";

	this.updatingTasks = new Set();

	this.updateTimer = null;

	/*
	 * Send the Todoist configuration to
	 * node_helper.js.
	 */
	this.sendSocketNotification(
		"SET_CONFIG",
		{
			todoistToken:
				this.config.todoistToken,

			updateInterval:
				this.config.updateInterval
		}
	);
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
		 * Configurable width.
		 */
		if (this.config.width) {
			wrapper.style.width = this.config.width;
		}

		/*
		 * Header
		 */
		const header =
			document.createElement("div");
		
		header.className =
			"todoist-header";
		
		/*
		 * Header left side
		 */
		const headerLeft =
			document.createElement("div");
		
		headerLeft.className =
			"todoist-header-left";
		
		const title =
			document.createElement("div");
		
		title.className =
			"todoist-title";
		
		title.textContent =
			"Todoist Tasks!";
		
		headerLeft.appendChild(title);
		
		/*
		 * List filter
		 */
		const listFilter =
			document.createElement("select");
		
		listFilter.className =
			"todoist-list-filter";
		
		/*
		 * All lists option
		 */
		const allOption =
			document.createElement("option");
		
		allOption.value = "all";
		allOption.textContent = "All Lists";
		
		listFilter.appendChild(allOption);
		
		/*
		 * Todoist projects
		 */
		this.projects.forEach((project) => {
			const option =
				document.createElement("option");
		
			option.value =
				String(project.id);
		
			option.textContent =
				project.name;
		
			listFilter.appendChild(option);
		});
		
		/*
		 * Determine the selected value.
		 *
		 * The config can use either:
		 *
		 * list: "all"
		 *
		 * or:
		 *
		 * list: "Work"
		 *
		 * If the config contains a project name,
		 * convert it to that project's ID.
		 */
		let selectedList =
			this.listFilter || "all";
		
		if (
			selectedList !== "all"
		) {
			const matchingProject =
				this.projects.find(
					(project) =>
						String(project.id) ===
							String(selectedList) ||
						project.name ===
							selectedList
				);
		
			if (matchingProject) {
				selectedList =
					String(matchingProject.id);
			}
		}
		
		listFilter.value =
			selectedList;
		
		/*
		 * Change filter immediately.
		 */
		listFilter.addEventListener(
			"change",
			(event) => {
				this.listFilter =
					event.target.value;
		
				this.updateDom(100);
			}
		);
		
		headerLeft.appendChild(
			listFilter
		);

		/*
		 * Assignee filter
		 */
		const assigneeFilter =
			document.createElement("select");
		
		assigneeFilter.className =
			"todoist-assignee-filter";
		
		/*
		 * All people option
		 */
		const allPeopleOption =
			document.createElement("option");
		
		allPeopleOption.value = "all";
		allPeopleOption.textContent =
			"All People";
		
		assigneeFilter.appendChild(
			allPeopleOption
		);
		
		/*
		 * Build the assignee list from the
		 * collaborator data supplied by Todoist.
		 */
		const assignees =
			Array.isArray(this.assignees)
				? [...this.assignees]
				: [];
		
		/*
		 * Sort alphabetically.
		 */
		assignees.sort(
			(a, b) =>
				String(a.name || "").localeCompare(
					String(b.name || "")
				)
		);
		
		/*
		 * Add people to dropdown.
		 */
		assignees.forEach((person) => {
			if (
				!person ||
				person.id === undefined ||
				person.id === null ||
				!person.name
			) {
				return;
			}
		
			const option =
				document.createElement("option");
		
			option.value =
				String(person.id);
		
			option.textContent =
				person.name;
		
			assigneeFilter.appendChild(
				option
			);
		});
		
		/*
		 * Restore current selection.
		 *
		 * If the selected person is no longer
		 * available, fall back to All People.
		 */
		const selectedAssignee =
			this.assigneeFilter || "all";
		
		const hasSelectedAssignee =
			Array.from(
				assigneeFilter.options
			).some(
				(option) =>
					option.value ===
					String(selectedAssignee)
			);
		
		assigneeFilter.value =
			hasSelectedAssignee
				? String(selectedAssignee)
				: "all";
		
		if (!hasSelectedAssignee) {
			this.assigneeFilter = "all";
		}
		
		/*
		 * Change assignee filter.
		 */
		assigneeFilter.addEventListener(
			"change",
			(event) => {
				this.assigneeFilter =
					event.target.value;
		
				this.updateDom(100);
			}
		);
		
		headerLeft.appendChild(
			assigneeFilter
		);
		
		header.appendChild(
			headerLeft
		);
		
		/*
		 * Add button
		 */
		const addButton =
			document.createElement("button");
		
		addButton.className =
			"todoist-add-button";
		
		addButton.type = "button";
		
		addButton.setAttribute(
			"aria-label",
			"Add task"
		);
		
		addButton.textContent = "+";
		
		addButton.addEventListener(
			"click",
			(event) => {
				event.stopPropagation();
				this.openAddTaskDialog();
			}
		);
		
		header.appendChild(
			addButton
		);
		
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
		 * Loading
		 */
		if (this.loading) {
			const loading = document.createElement("div");

			loading.className = "todoist-status";
			loading.textContent = "Loading...";

			wrapper.appendChild(loading);

			return wrapper;
		}

		/*
		 * Error
		 */
		if (this.error) {
			const error = document.createElement("div");

			error.className = "todoist-error";
			error.textContent = this.error;

			wrapper.appendChild(error);

			return wrapper;
		}

		/*
		 * Get tasks appropriate for the selected view.
		 */
		let displayTasks = this.getFilteredTasks();


		if (
			this.config.view === "today-tomorrow"
		) {
			displayTasks =
				this.getTodayTomorrowTasks(
					displayTasks
				);
		}

		/*
		 * Empty state
		 */
		if (!displayTasks.length) {
			const empty = document.createElement("div");

			empty.className = "todoist-empty";
			empty.textContent = "No tasks";

			wrapper.appendChild(empty);

			return wrapper;
		}

		/*
		 * GROUPED VIEW
		 *
		 * Used for:
		 *   all
		 *   today-tomorrow
		 */
		if (
			this.config.view === "all" ||
			this.config.view === "today-tomorrow"
		) {
			const groups =
				this.groupTasks(displayTasks);

			let sectionOrder;

			if (
				this.config.view ===
				"today-tomorrow"
			) {
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

			let remainingTasks =
				Number(this.config.maxTasks);

			if (
				!Number.isFinite(remainingTasks) ||
				remainingTasks <= 0
			) {
				remainingTasks = 50;
			}

			sectionOrder.forEach((section) => {
				if (remainingTasks <= 0) {
					return;
				}

				const sectionTasks =
					groups[section.key] || [];

				if (!sectionTasks.length) {
					return;
				}

				const sectionElement =
					document.createElement("div");

				sectionElement.className =
					"todoist-section";

				/*
				 * Section title
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
				 * Section task list
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
		} else {
			/*
			 * NORMAL LIST VIEW
			 *
			 * Used for:
			 *   today
			 *   upcoming
			 */
			const taskList =
				document.createElement("div");

			taskList.className =
				"todoist-task-list";

			displayTasks
				.slice(0, this.config.maxTasks)
				.forEach((task) => {
					taskList.appendChild(
						this.createTaskElement(task)
					);
				});

			wrapper.appendChild(taskList);
		}

		return wrapper;
	},
 
	/*
	 * Get tasks for Today + Tomorrow.
	 *
	 * This uses the task set supplied by getDom()
	 * and filters it locally.
	 */
	getTodayTomorrowTasks(tasks) {
		const today =
			this.getLocalDateString(0);
	
		const tomorrow =
			this.getLocalDateString(1);
	
		return tasks.filter((task) => {
			const date =
				this.getTaskDate(task);
	
			return (
				date === today ||
				date === tomorrow
			);
		});
	},

	getFilteredTasks() {
		const selectedList =
			this.listFilter || "all";
	
		const selectedAssignee =
			this.assigneeFilter || "all";
	
		return this.tasks.filter((task) => {
			if (!task) {
				return false;
			}
	
			/*
			 * -------------------------
			 * LIST / PROJECT FILTER
			 * -------------------------
			 */
	
			let matchesList = true;
	
			if (selectedList !== "all") {
				matchesList = false;
	
				if (
					task.project_id !== undefined &&
					task.project_id !== null
				) {
					matchesList =
						String(task.project_id) ===
						String(selectedList);
				}
	
				/*
				 * Fallback for enriched
				 * projectName property.
				 */
				if (
					!matchesList &&
					task.projectName
				) {
					const project =
						this.projects.find(
							(item) =>
								item.name ===
								task.projectName
						);
	
					if (project) {
						matchesList =
							String(project.id) ===
							String(selectedList);
					}
				}
			}
	
			if (!matchesList) {
				return false;
			}
	
			/*
			 * -------------------------
			 * ASSIGNEE FILTER
			 * -------------------------
			 */
			
			if (
				selectedAssignee !== "all"
			) {
				let taskAssigneeId = null;
			
			/*
			 * Todoist returns responsible_uid
			 * for the assigned user.
			 */
			if (
				task.responsible_uid !== undefined &&
				task.responsible_uid !== null
			) {
				taskAssigneeId =
					String(task.responsible_uid);
			}
			
			/*
			 * Fall back to assignee_id if present.
			 */
			if (
				!taskAssigneeId &&
				task.assignee_id !== undefined &&
				task.assignee_id !== null
			) {
				taskAssigneeId =
					String(task.assignee_id);
			}
			
			if (
				taskAssigneeId !==
				String(selectedAssignee)
			) {
				return false;
			}
			}
	
			return true;
		});
	},

	/*
	 * Group tasks into:
	 *
	 * Overdue
	 * Today
	 * Tomorrow
	 * Upcoming
	 * No Due Date
	 */
	groupTasks(tasks) {
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

		tasks.forEach((task) => {
			const date =
				this.getTaskDate(task);

			if (!date) {
				groups.noDueDate.push(task);
				return;
			}

			if (date < today) {
				groups.overdue.push(task);
				return;
			}

			if (date === today) {
				groups.today.push(task);
				return;
			}

			if (date === tomorrow) {
				groups.tomorrow.push(task);
				return;
			}

			if (date > tomorrow) {
				groups.upcoming.push(task);
				return;
			}

			groups.noDueDate.push(task);
		});

		/*
		 * Oldest overdue first.
		 */
		groups.overdue.sort((a, b) => {
			return this.getTaskDate(a).localeCompare(
				this.getTaskDate(b)
			);
		});

		/*
		 * Upcoming sorted chronologically.
		 */
		groups.upcoming.sort((a, b) => {
			return this.getTaskDate(a).localeCompare(
				this.getTaskDate(b)
			);
		});

		return groups;
	},

	/*
	 * Get YYYY-MM-DD from a Todoist task.
	 */
	getTaskDate(task) {
		if (!task || !task.due) {
			return null;
		}

		if (
			typeof task.due.date === "string" &&
			task.due.date.length >= 10
		) {
			return task.due.date.substring(0, 10);
		}

		if (
			typeof task.due.datetime === "string" &&
			task.due.datetime.length >= 10
		) {
			return task.due.datetime.substring(0, 10);
		}

		return null;
	},

	/*
	 * Get a local date as YYYY-MM-DD.
	 */
	getLocalDateString(daysFromToday) {
		const date = new Date();

		date.setHours(12, 0, 0, 0);

		date.setDate(
			date.getDate() + daysFromToday
		);

		const year =
			date.getFullYear();

		const month =
			String(date.getMonth() + 1)
				.padStart(2, "0");

		const day =
			String(date.getDate())
				.padStart(2, "0");

		return (
			year +
			"-" +
			month +
			"-" +
			day
		);
	},

	/*
	 * Open Add Task dialog.
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
	 * Create Add Task dialog.
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

		title.textContent =
			"Add Task";

		dialog.appendChild(title);

		/*
		 * Task input
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
		 * Project
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

		this.projects.forEach((project) => {
			const option =
				document.createElement("option");

			option.value =
				String(project.id);

			option.textContent =
				project.name;

			projectSelect.appendChild(
				option
			);
		});

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
		 * Due date
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

		dueRow.appendChild(dueLabel);

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

		dueOptions.forEach((dueOption) => {
			const option =
				document.createElement("option");

			option.value =
				dueOption.value;

			option.textContent =
				dueOption.label;

			dueSelect.appendChild(
				option
			);
		});

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
		 * Buttons
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

		buttons.appendChild(addButton);

		dialog.appendChild(buttons);

		return dialog;
	},

	/*
	 * Submit new task.
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
	 * Create individual task.
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
		 * Completion checkbox
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
		 * Everything after the checkbox lives
		 * on the same horizontal line.
		 */
		const content =
			document.createElement("div");
	
		content.className =
			"todoist-task-content";
	
		/*
		 * Task name
		 */
		const taskText =
			document.createElement("div");
	
		taskText.className =
			"todoist-task-text";
	
		taskText.textContent =
			task.content || "";
	
		content.appendChild(taskText);
	
		/*
		 * Metadata container
		 */
		const metadata =
			document.createElement("div");
	
		metadata.className =
			"todoist-task-meta";
	
		/*
		 * Project
		 */
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
	
			metadata.appendChild(project);
		}
	
		/*
		 * Due date
		 */
		if (
			this.config.showDueDate &&
			task.due
		) {
			const due =
				document.createElement("span");
	
			due.className =
				"todoist-due";
	
			due.textContent =
				task.due.string || "";
	
			metadata.appendChild(due);
		}
	
		/*
		 * Assignee
		 */
		if (this.config.showAssignee) {
			const assignee =
				this.getAssigneeName(task);
	
			if (assignee) {
				const assigneeElement =
					document.createElement("span");
	
				assigneeElement.className =
					"todoist-assignee";
	
				assigneeElement.textContent =
					assignee;
	
				metadata.appendChild(
					assigneeElement
				);
			}
		}
	
		/*
		 * Only add metadata if there is
		 * actually something to display.
		 */
		if (
			metadata.childNodes.length > 0
		) {
			content.appendChild(metadata);
		}
	
		taskElement.appendChild(content);
	
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
	 * Find assignee name.
	 */
	getAssigneeName(task) {
		if (!task) {
			return "";
		}
	
		let assigneeId = null;
	
		if (
			task.responsible_uid !== undefined &&
			task.responsible_uid !== null
		) {
			assigneeId =
				String(task.responsible_uid);
		} else if (
			task.assignee_id !== undefined &&
			task.assignee_id !== null
		) {
			assigneeId =
				String(task.assignee_id);
		}
	
		if (assigneeId) {
			const assignee =
				this.assignees.find(
					(person) =>
						String(person.id) ===
						assigneeId
				);
	
			if (
				assignee &&
				assignee.name
			) {
				return assignee.name;
			}
		}
	
		/*
		 * Fall back to an already-enriched
		 * name if one exists.
		 */
		if (
			typeof task.assignee_name ===
			"string"
		) {
			return task.assignee_name;
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
	
		return "";
	},

	/*
	 * Complete/reopen task.
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

		this.updatingTasks.add(taskId);

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
	 * Task selected.
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
	 * Receive node_helper messages.
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
				Log.info("MMM-TodoistInteractive: CONFIG_READY received");
				this.configReady = true;
				
				this.sendSocketNotification(
					"GET_PROJECTS"
				);

				this.sendSocketNotification(
				"GET_ASSIGNEES"
				);
				
				this.requestTasks();
				break;

			case "TASKS":
				this.handleTasks(payload);
				break;

			case "TASK_UPDATED":
				this.handleTaskUpdated(payload);
				break;

			case "TASK_ADDED":
				this.handleTaskAdded(payload);
				break;

			case "PROJECTS":
				this.handleProjects(payload);
				break;

			case "ASSIGNEES":
				this.handleAssignees(payload);
				break;

			case "TODOIST_ERROR":
				this.handleError(payload);
				break;

			default:
				break;
		}
	},

	/*
	 * New task created.
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
	 * Request tasks.
	 */
	requestTasks() {
		Log.info(
			"MMM-TodoistInteractive: requestTasks() called"
		);
		
		if (!this.configReady) {
			return;
		}

		this.loading = true;
		this.error = null;

		this.updateDom();

		/*
		 * For today-tomorrow we retrieve all active
		 * tasks and filter them in the front end.
		 */
		let requestedView =
			this.config.view;

		if (
			this.config.view ===
			"today-tomorrow"
		) {
			requestedView = "all";
		}

		Log.info(
			"MMM-TodoistInteractive: sending GET_TASKS, view=" +
			requestedView
		);

		this.sendSocketNotification(
			"GET_TASKS",
			{
				view: requestedView,
				showCompleted:
					this.config.showCompleted
			}
		);
	},

	/*
	 * Handle tasks.
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
	 * Handle updated task.
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
	 * Handle projects.
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
	 * Handle Todoist collaborators.
	 */
	handleAssignees(payload) {
		if (Array.isArray(payload)) {
			this.assignees = payload;
		} else if (
			payload &&
			Array.isArray(payload.assignees)
		) {
			this.assignees =
				payload.assignees;
		} else {
			this.assignees = [];
		}
	
		this.updateDom(100);
	},

	/*
	 * Handle errors.
	 */
	handleError(payload) {
		this.loading = false;
		this.addingTask = false;

		if (
			typeof payload === "string"
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
	 * Schedule automatic updates.
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
	 * MagicMirror lifecycle.
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
	 * Stop.
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
