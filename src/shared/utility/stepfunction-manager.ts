import * as sfn from '@aws-sdk/client-sfn';
import { StepfunctionStep, StepfunctionHistoryEvent } from '../types/aws-types';

export class StepFunctionManager {
	protected client: sfn.SFN;

	constructor() {
		this.client = new sfn.SFN({});
	}

	public async startExecution(
		params: sfn.StartExecutionCommandInput,
	): Promise<sfn.StartExecutionCommandOutput> {
		try {
			const command = new sfn.StartExecutionCommand(params);
			const response = await this.client.send(command);
			if (response.executionArn) {
				console.debug(`Stepfunction execution started for ${params.stateMachineArn}`);
				return response;
			} else {
				const message = `Execution ARN not found for ${params.stateMachineArn}`;
				console.error(message);
				throw new Error(message);
			}
		} catch (error) {
			console.error(`Failed to start execution: ${error}`);
			throw error;
		}
	}

	public async describeExecution(
		params: sfn.DescribeExecutionCommandInput,
	): Promise<sfn.DescribeExecutionCommandOutput> {
		try {
			const command = new sfn.DescribeExecutionCommand(params);
			const response = await this.client.send(command);
			if (response.executionArn && response.status) {
				console.debug(`Stepfunction execution found for ${params.executionArn}`);
				return response;
			} else {
				const message = `Execution ARN not found: ${params.executionArn}`;
				console.error(message);
				throw new Error(message);
			}
		} catch (error) {
			console.error(`Failed to describe execution: ${error}`);
			throw error;
		}
	}

	public async getExecutionHistory(
		params: sfn.GetExecutionHistoryCommandInput,
	): Promise<sfn.GetExecutionHistoryCommandOutput> {
		try {
			const paginatorConfig = {
				client: this.client,
				pageSize: 1000, // you can set pageSize up to 1000
			};

			const paginator = sfn.paginateGetExecutionHistory(paginatorConfig, params);

			const allEvents: sfn.HistoryEvent[] = [];
			let lastMetadata: sfn.__MetadataBearer['$metadata'] = {
				httpStatusCode: 200,
				requestId: '',
				extendedRequestId: '',
				cfId: '',
				attempts: 1,
				totalRetryDelay: 0,
			};

			for await (const page of paginator) {
				if (page.events) {
					console.debug(`Execution history found for ${params.executionArn}`);
					console.debug(page);
					allEvents.push(...page.events);
					lastMetadata = page.$metadata;
				} else {
					const message = `Execution history not found: ${params.executionArn}`;
					console.error(message);
					throw new Error(message);
				}
			}

			return { events: allEvents, $metadata: lastMetadata };
		} catch (error) {
			console.error(`Failed to describe execution history: ${error}`);
			throw error;
		}
	}

	public async getLastEnteredStep(
		response: sfn.GetExecutionHistoryCommandOutput,
	): Promise<StepfunctionStep> {
		try {
			if (!response.events) {
				throw new Error('No events found in the response');
			}

			const failedEventIndex = response.events.findIndex(
				(event) => event.type === sfn.HistoryEventType.TaskFailed,
			);

			const enteredEvents = response.events
				.slice(0, failedEventIndex !== -1 ? failedEventIndex : undefined)
				.filter((event) => event.type === sfn.HistoryEventType.TaskStateEntered);

			const latestEvent = enteredEvents[enteredEvents.length - 1];
			const stepName = latestEvent.stateEnteredEventDetails?.name || 'Unknown step name';

			console.debug(`Current step is type: ${latestEvent.type}. Name: ${stepName}`);
			const currentStep = {
				type: latestEvent.type || 'Unknown step type',
				name: stepName,
			};
			return currentStep;
		} catch (error) {
			console.error(`Failed to get current step: ${error}`);
			throw error;
		}
	}

	public async getLastMapIterationFailure(
		response: sfn.GetExecutionHistoryCommandOutput,
	): Promise<StepfunctionStep> {
		try {
			if (!response.events) {
				throw new Error('No events found in the response');
			}
			const failedEventIndex = response.events.findIndex(
				(event) => event.type === sfn.HistoryEventType.MapIterationFailed,
			);

			if (failedEventIndex === -1) {
				console.debug('No MapIterationFailed event found.');
				throw Error('No MapIterationFailed event found.');
			}

			const failedEvent = response.events[failedEventIndex];
			const stepName =
				failedEvent.mapIterationFailedEventDetails?.name || 'Unknown step name';
			console.debug(
				`Last MapIterationFailed event is at index: ${failedEventIndex}. Name: ${stepName}`,
			);

			const lastFailedStep = {
				type: failedEvent.type || 'Unknown step type',
				name: stepName,
			};

			return lastFailedStep;
		} catch (error) {
			console.error(`Failed to get last MapIterationFailed event: ${error}`);
			throw error;
		}
	}

	public async getLastSuccessfulStep(
		response: sfn.GetExecutionHistoryCommandOutput,
	): Promise<StepfunctionStep> {
		try {
			if (!response.events) {
				throw new Error('No events found in the response');
			}
			const failedEventIndex = response.events.findIndex(
				(event) => event.type === sfn.HistoryEventType.TaskFailed,
			);
			const exitedEvents = response.events
				.slice(0, failedEventIndex !== -1 ? failedEventIndex : undefined)
				.filter((event) => event.type === sfn.HistoryEventType.TaskStateExited);

			const successfulEvents = exitedEvents.filter(
				(event) => event.stateExitedEventDetails?.output,
			);

			const latestEvent = successfulEvents[successfulEvents.length - 1];

			let lastSuccessfulStep;
			if (latestEvent) {
				const stepName = latestEvent.stateExitedEventDetails?.name || 'Unknown step name';
				console.debug(
					`Last successful step is type: ${latestEvent.type}. Name: ${stepName}`,
				);
				lastSuccessfulStep = {
					type: latestEvent.type || 'Uknown step type',
					name: stepName,
				};
			} else {
				console.debug('No successful step found. Defaulting to "State Provision started"');
				lastSuccessfulStep = {
					type: 'Pass',
					name: 'State Provision started',
				};
			}

			return lastSuccessfulStep;
		} catch (error) {
			console.error(`Failed to get last successful step: ${error}`);
			throw error;
		}
	}

	public async getExecutionFailure(
		response: sfn.GetExecutionHistoryCommandOutput,
	): Promise<StepfunctionHistoryEvent> {
		try {
			if (!response.events) {
				throw new Error('No events found in the response');
			}
			console.log(sfn.HistoryEventType.TaskFailed); // should print: TaskFailed

			response.events.forEach((event) => {
				console.log(event); // should print the type of each event
			});

			const failedTask = response.events.filter(
				(event) => event.type === sfn.HistoryEventType.TaskFailed,
			);

			if (failedTask.length === 0) {
				throw new Error('No TaskFailed events found');
			}

			const lastFailedTask = failedTask[failedTask.length - 1];

			if (!lastFailedTask || !lastFailedTask.taskFailedEventDetails) {
				throw new Error('No failed task details found');
			}

			let cause = null;
			if (lastFailedTask.taskFailedEventDetails.cause) {
				cause = JSON.parse(lastFailedTask.taskFailedEventDetails.cause);
			}

			const failedExecutionDetails = {
				type: lastFailedTask.type || 'Unknown step type',
				resourceType: lastFailedTask.taskFailedEventDetails.resourceType,
				error: lastFailedTask.taskFailedEventDetails.error || 'Unknown error',
				cause,
			};

			return failedExecutionDetails;
		} catch (error) {
			console.error(`Failed to get last failed step: ${error}`);
			throw error;
		}
	}
}
