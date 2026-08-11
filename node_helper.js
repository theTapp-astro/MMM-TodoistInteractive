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
				throw new Error("Task content cannot be empty.");
			}

			const task = await this.todoistRequest("/tasks", {
				method: "POST",
				body: JSON.stringify({
					content
				})
			});

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
			const projects = await this.getAllProjects();

			const projectMap = new Map();

			for (const project of projects) {
				projectMap.set(
					String(project.id),
					project.name
				);
			}

			const normalizedTasks = tasks.map((task) => {
				const projectName =
					projectMap.get(String(task.project_id)) ||
					"";

				return {
					...task,
					projectName
				};
			});

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
