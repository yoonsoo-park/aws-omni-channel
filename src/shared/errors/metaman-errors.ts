export abstract class LambdaError extends Error {
	public readonly statusCode: number;
	public details: string;

	constructor(message: string, statusCode?: number, details?: string) {
		super(message);
		this.statusCode = statusCode ?? 500;
		this.details = details ?? '';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class GitHubError extends LambdaError {
	constructor(message: string, details?: string) {
		super(message, 500, details);
		this.name = 'GithubError';
	}
}

export class UpdateDatadogError extends LambdaError {
	constructor(message: string, details?: string) {
		super(message, 500, details);
		this.name = 'UpdateDatadogError';
	}
}

export class StepFunctionManagerError extends LambdaError {
	constructor(message: string, details?: string) {
		super(message, 500, details);
		this.name = 'StepFunctionManagerError';
	}
}
