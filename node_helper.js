const NodeHelper = require("node_helper");

const TODOIST_API_BASE = "https://api.todoist.com/api/v1";

module.exports = NodeHelper.create({
	start() {
		console.log(`[${this.name}] Node helper started`);

		this.todoistToken = null;
		this.updateInterval = 60000;
	},

	/**
	 * Receive messages from TodoistInteractive.js
	 */
	socketNotificationReceived(notification, payload) {
		switch (notification) {
			case "SET_CONFIG":
				this.handleSetConfig(payload);
				break;

			case "GET_TASKS":
				this.getTasks(payload);
				break;

			case "TOGGLE_TASK":
				this.toggleTask(payload);
				break;

			case "ADD_TASK":
				this.addTask(payload);
				break;

			case "GET_PROJECTS":
				this.getProjects();
				break;

			default:
				console.warn(
					`[${this.name}] Unknown notification: ${notification}`
				);
		}
	},

	/**
	 * Create a new Todoist task.
	 */
	async addTask(payload) {
		try {
			if (!payload || !payload.content) {
				throw new Error("Task content is required.");
			}
	
			const content = String(payload.content).trim();
	
			if (!content) {
				throw new Error(
					"Task content cannot be empty."
				);
			}
	
			const taskData = {
				content
			};
	
			/*
			 * Project
			 */
	
			if (payload.projectId) {
				taskData.project_id =
					String(payload.projectId);
			}
	
			/*
			 * Due date
			 */
	
			if (payload.dueString) {
				taskData.due_string =
					String(payload.dueString);
			}
	
			const task = await this.todoistRequest(
				"/tasks",
				{
					method: "POST",
					body: JSON.stringify(taskData)
				}
			);
	
			console.log(
				`[${this.name}] Task added: ${task.id}`
			);
	
			this.sendSocketNotification(
				"TASK_ADDED",
				task
			);
		} catch (error) {
			this.handleApiError(error);
		}
	},

	/**
	 * Get Todoist projects for the Add Task dialog.
	 */
	async getProjects() {
		try {
			const projects = await this.getAllProjects();
	
			this.sendSocketNotification(
				"PROJECTS",
				projects
			);
		} catch (error) {
			this.handleApiError(error);
		}
	},

	/**
	 * Get all Todoist collaborators that can be
	 * used as task assignees.
	 */
	async getAssignees() {
		try {
			const projects =
				await this.getAllProjects();
	
			const assignees =
				await this.getAllCollaborators(
					projects
				);
	
			this.sendSocketNotification(
				"ASSIGNEES",
				assignees
			);
		} catch (error) {
			this.handleApiError(error);
		}
	},
		
	/**
	 * Store configuration received from the front-end.
	 */
	handleSetConfig(payload) {
		if (!payload || typeof payload !== "object") {
			this.sendError("Invalid configuration received.");
			return;
		}

		if (!payload.todoistToken) {
			this.sendError(
				"Todoist API token is missing. Add todoistToken to your MagicMirror config."
			);
			return;
		}

		this.todoistToken = payload.todoistToken;

		if (
			typeof payload.updateInterval === "number" &&
			payload.updateInterval > 0
		) {
			this.updateInterval = payload.updateInterval;
		}

		console.log(`[${this.name}] Configuration received`);

		this.sendSocketNotification("CONFIG_READY");
	},

	/**
	 * Make an authenticated request to the Todoist API.
	 */
	async todoistRequest(path, options = {}) {
		if (!this.todoistToken) {
			throw new Error("Todoist API token has not been configured.");
		}

		const headers = {
			Authorization: `Bearer ${this.todoistToken}`,
			"Content-Type": "application/json",
			...(options.headers || {})
		};

		const response = await fetch(
			`${TODOIST_API_BASE}${path}`,
			{
				...options,
				headers
			}
		);

		if (!response.ok) {
			let errorMessage = `Todoist API returned HTTP ${response.status}.`;

			try {
				const errorData = await response.json();

				if (errorData?.error) {
					errorMessage = errorData.error;
				}

				if (errorData?.message) {
					errorMessage = errorData.message;
				}
			} catch (error) {
				// Response wasn't JSON. Keep the HTTP error.
			}

			const apiError = new Error(errorMessage);
			apiError.status = response.status;

			throw apiError;
		}

		/*
		 * Some Todoist endpoints return 204/empty responses.
		 */
		if (response.status === 204) {
			return null;
		}

		const text = await response.text();

		if (!text) {
			return null;
		}

		try {
			return JSON.parse(text);
		} catch (error) {
			return text;
		}
	},

	/**
	 * Get tasks based on the requested view.
	 */
	async getTasks(payload = {}) {
		try {
			if (!this.todoistToken) {
				throw new Error(
					"Todoist API token has not been configured."
				);
			}

			const view = payload.view || "today";

			let tasks;

			switch (view) {
				case "today":
					tasks = await this.getTasksByFilter("today");
					break;

				case "upcoming":
					tasks = await this.getTasksByFilter("7 days");
					break;

				case "all":
					tasks = await this.getAllActiveTasks();
					break;

				default:
					/*
					 * Allow a Todoist filter query to be supplied
					 * through the MagicMirror configuration later.
					 */
					tasks = await this.getTasksByFilter(view);
					break;
			}

			/*
			 * Get projects separately because the task object contains
			 * project_id, while the UI wants a human-readable name.
			 */
			const projects =
				await this.getAllProjects();
			
			const projectMap =
				new Map();
			
			for (const project of projects) {
				projectMap.set(
					String(project.id),
					project.name
				);
			}
			
			/*
			 * Build an assignee lookup from the
			 * collaborators of the shared projects.
			 */
			const assignees =
				await this.getAllCollaborators(
					projects
				);
			
			const assigneeMap =
				new Map();
			
			for (const assignee of assignees) {
				assigneeMap.set(
					String(assignee.id),
					assignee.name
				);
			}
			
			/*
			 * Enrich every task with the project
			 * name and assignee name.
			 */
			const normalizedTasks =
				tasks.map((task) => {
					const projectName =
						projectMap.get(
							String(task.project_id)
						) || "";
			
					let assigneeName = "";
			
					if (
						task.responsible_uid !==
							undefined &&
						task.responsible_uid !== null
					) {
						assigneeName =
							assigneeMap.get(
								String(
									task.responsible_uid
								)
							) || "";
					}
			
					/*
					 * Fall back to assignee_id if the
					 * API ever returns that instead.
					 */
					if (
						!assigneeName &&
						task.assignee_id !==
							undefined &&
						task.assignee_id !== null
					) {
						assigneeName =
							assigneeMap.get(
								String(
									task.assignee_id
								)
							) || "";
					}
			
					return {
						...task,
						projectName,
						assignee_name:
							assigneeName
					};
				});
			
			/*
			 * Send the collaborator list as well so
			 * the frontend can populate the dropdown
			 * even when a person has no task in the
			 * current view.
			 */
			this.sendSocketNotification(
				"ASSIGNEES",
				assignees
			);

			/*
			 * Respect maxTasks on the client, but return the complete
			 * result set here so the UI can eventually support paging.
			 */
			this.sendSocketNotification(
				"TASKS",
				normalizedTasks
			);
		} catch (error) {
			this.handleApiError(error);
		}
	},

	/**
	 * Get tasks matching a Todoist filter.
	 *
	 * Todoist's current API provides a dedicated
	 * /tasks/filter endpoint.
	 */
	async getTasksByFilter(filter) {
		const tasks = [];
		let cursor = null;

		do {
			const params = new URLSearchParams();

			params.set("query", filter);
			params.set("limit", "200");

			if (cursor) {
				params.set("cursor", cursor);
			}

			const data = await this.todoistRequest(
				`/tasks/filter?${params.toString()}`
			);

			if (data?.results && Array.isArray(data.results)) {
				tasks.push(...data.results);
			}

			cursor = data?.next_cursor || null;
		} while (cursor);

		return tasks;
	},

	/**
	 * Get all active tasks.
	 */
	async getAllActiveTasks() {
		const tasks = [];
		let cursor = null;

		do {
			const params = new URLSearchParams();

			params.set("limit", "200");

			if (cursor) {
				params.set("cursor", cursor);
			}

			const data = await this.todoistRequest(
				`/tasks?${params.toString()}`
			);

			if (data?.results && Array.isArray(data.results)) {
				tasks.push(...data.results);
			}

			cursor = data?.next_cursor || null;
		} while (cursor);

		return tasks;
	},

	/**
	 * Get a unique list of collaborators from
	 * all shared projects.
	 *
	 * Todoist exposes collaborators on a
	 * per-project basis.
	 */
	async getAllCollaborators(projects) {
		const collaboratorMap =
			new Map();
	
		for (const project of projects) {
			if (
				!project ||
				!project.id
			) {
				continue;
			}
	
			/*
			 * Collaborators only apply to shared
			 * projects. Personal projects do not
			 * need a collaborator request.
			 */
			if (
				project.is_shared === false &&
				project.is_shared !== undefined
			) {
				continue;
			}
	
			try {
				let cursor = null;
	
				do {
					const params =
						new URLSearchParams();
	
					params.set(
						"limit",
						"200"
					);
	
					if (cursor) {
						params.set(
							"cursor",
							cursor
						);
					}
	
					const data =
						await this.todoistRequest(
							`/projects/${encodeURIComponent(
								String(project.id)
							)}/collaborators?${params.toString()}`
						);
	
					if (
						data?.results &&
						Array.isArray(
							data.results
						)
					) {
						for (
							const collaborator
							of data.results
						) {
							if (
								!collaborator ||
								collaborator.id ===
									undefined ||
								collaborator.id ===
									null
							) {
								continue;
							}
	
							const id =
								String(
									collaborator.id
								);
	
							const name =
								collaborator.full_name ||
								collaborator.name ||
								"";
	
							if (
								!name
							) {
								continue;
							}
	
							collaboratorMap.set(
								id,
								{
									id,
									name
								}
							);
						}
					}
	
					cursor =
						data?.next_cursor ||
						null;
				} while (cursor);
			} catch (error) {
				/*
				 * One inaccessible/non-shared project
				 * should not prevent collaborators from
				 * all other projects from appearing.
				 */
				console.warn(
					`[${this.name}] Unable to get collaborators for project ${project.id}: ${error.message}`
				);
			}
		}
	
		return Array.from(
			collaboratorMap.values()
		);
	},
	
	/**
	 * Get all active projects.
	 */
	async getAllProjects() {
		const projects = [];
		let cursor = null;

		do {
			const params = new URLSearchParams();

			params.set("limit", "200");

			if (cursor) {
				params.set("cursor", cursor);
			}

			const data = await this.todoistRequest(
				`/projects?${params.toString()}`
			);

			if (data?.results && Array.isArray(data.results)) {
				projects.push(...data.results);
			}

			cursor = data?.next_cursor || null;
		} while (cursor);

		return projects;
	},

	/**
	 * Complete or reopen a task.
	 */
	async toggleTask(payload) {
		try {
			if (!payload || !payload.taskId) {
				throw new Error("No task ID was supplied.");
			}

			const taskId = encodeURIComponent(
				String(payload.taskId)
			);

			const completed = Boolean(payload.completed);

			let endpoint;

			if (completed) {
				endpoint = `/tasks/${taskId}/close`;
			} else {
				endpoint = `/tasks/${taskId}/reopen`;
			}

			await this.todoistRequest(endpoint, {
				method: "POST"
			});

			console.log(
				`[${this.name}] Task ${payload.taskId} ` +
				`${completed ? "completed" : "reopened"}`
			);

			this.sendSocketNotification(
				"TASK_UPDATED",
				{
					taskId: payload.taskId,
					completed
				}
			);
		} catch (error) {
			this.handleApiError(error);
		}
	},

	/**
	 * Convert API errors into safe messages for the UI.
	 */
	handleApiError(error) {
		console.error(
			`[${this.name}] Todoist error:`,
			error.message
		);

		let message = error.message ||
			"Unable to communicate with Todoist.";

		if (error.status === 401) {
			message =
				"Todoist authentication failed. Check your API token.";
		} else if (error.status === 403) {
			message =
				"Todoist denied access to this resource.";
		} else if (error.status === 404) {
			message =
				"Todoist could not find the requested resource.";
		} else if (error.status >= 500) {
			message =
				"Todoist is currently unavailable.";
		}

		this.sendError(message);
	},

	/**
	 * Send a safe error message to the front-end.
	 */
	sendError(message) {
		this.sendSocketNotification(
			"TODOIST_ERROR",
			{
				message
			}
		);
	}
});
