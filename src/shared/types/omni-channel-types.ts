import {
	ExecutionContext,
	StepFunctionContext,
	StepfunctionStep,
	StepfunctionHistoryEvent,
} from './aws-types';

export interface EventBusInfo {
	eventBusArn: string;
	eventBusName: string;
}

export type Jsonable =
	| string
	| number
	| boolean
	| null
	| undefined
	| Jsonable[]
	| { [key: string]: Jsonable };

export interface UserInfo {
	email?: string;
	slackChannel?: string;
}

/** The expected input to the State-Provisioning Step-Function. */
export interface StepFunctionInput {
	/**
	 * Reserved for future use. This will be the caller's DevHub auth url
	 * which will be used for DevHub access.
	 * */
	devHubAuthUrl?: string;

	/**
	 * Optional user info that tells the step function where to send status updates.
	 */
	userInfo?: UserInfo;

	/**
	 * AWS User Arn
	 */
	tenantArn?: string;
}

export interface Results {
	[key: string]: any;
}

export interface BucketKeys {
	[key: string]: string;
}

export interface StepFunctionPayload extends StepFunctionInput {
	/**
	 * The repositories to be provisioned.
	 */
	repositories: {
		/**
		 * The name of the repository.
		 */
		repoName: string;

		/**
		 * The previous version of the repository.
		 */
		previousVersion: string;

		/**
		 * The new version of the repository.
		 */
		newVersion: string;
	}[];
}

export interface CloneRepoLambdaInput {
	input: any;
	payload: {
		repoPaths: string[];
		repoUrl: string; // URL of the GitHub repository
		previousVersion: string; // Previous version of the repository
		newVersion: string; // New version of the repository
	};
}

export interface ComparisonLambdaInput {
	payload: {
		repoPaths: string[];
	};
}

/**
 * The expected input shared between states of the State-Provisioning Step-Function.
 * Lambdas invoked by the State-Provisioning Step-Function expect and return this.
 */
export interface StepLambdaInput {
	/**
	 * The payload of modifiable data that is passed between lambdas/states in the step function.
	 * Lambdas invoked by the State-Provisioning Step-Function exchange data through this payload.
	 */
	payload: StepFunctionPayload;

	/**
	 * The context passed down from invoking the step function.
	 */
	context: StepFunctionContext;
}

export interface GetExecutionStatusResponse {
	executionArn: string;
	executionId: string;
	name: string;
	status: string;
	orgAuthUrl?: string;
	currentStep?: StepfunctionStep;
	failedStep?: StepfunctionStep;
	failureDetails?: StepfunctionHistoryEvent;
	lastSuccessfulStep?: StepfunctionStep;
}

export interface StateMachineContext {
	Id: string;
	Name: string;
}

export interface UpdateDatadogInput {
	payload: StepFunctionPayload;
	Execution: ExecutionContext;
	StateMachine: StateMachineContext;
	Cause?: string;
	Error?: string;
}

export interface GetExecutionStatusInput {
	id: string;
}

interface RepoVersion {
	repo_name: string;
	previous_version: string;
	new_version: string;
	namespace: string;
}

interface SObject {
	namespace_prefix: string;
	name: string;
	description: string | null;
}

export interface ResultData {
	repo_version_list: RepoVersion[];
	new_sobjects: SObject[];
	added_fields: Record<string, any[]>;
	deleted_fields: Record<string, any[]>;
	compared_fields: any[];
	previous_version_fields: Record<string, any[]>;
	new_version_fields: Record<string, any[]>;
}

export interface PermDiffResultData {
	repo_version_list: RepoVersion[];
	total_permission_changes: Record<string, any>;
}

export interface PermListResultData {
	repo_version_list: Array<{
		repo_name: string;
		version: string;
		namespace: string;
	}>;
	all_permissions: Array<{
		permission_paths_dict: {
			custom_permissions_paths: string[];
			permission_sets_paths: string[];
			permission_set_group_paths: string[];
		};
		sub_perms: {
			'Custom Permissions': Record<string, any>;
			'Permission Sets': Record<string, any>;
			'Permission Set Groups': Record<string, any>;
		};
		repo_name: string;
	}>;
}
