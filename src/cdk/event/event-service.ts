import { Feature, NodejsFunction } from '@ncino/aws-cdk';
import { EventBus, IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { join } from 'node:path';
import { EventBusInfo } from '../../shared/types/omni-channel-types';

/**
 * Represents an event service that allows publishing and subscribing to events.
 */
export interface IEventService {
	/**
	 * Gets the Lambda function associated with the event service.
	 * @returns The Lambda function object.
	 */
	getEventLambdaFunction(): NodejsFunction;
}

/**
 * Properties required for initializing an EventBridgeService instance.
 */
interface EventBridgeServiceProps {
	feature: Feature;
	region: string;
	account: string;
	env: { [key: string]: string };
	status?: string;
	devMode?: boolean;
}

/**
 * Represents a service for interacting with AWS EventBridge.
 */
export class EventBridgeService implements IEventService {
	//Singleton
	static eventBus: IEventBus | null = null;
	status: string;
	feature: Feature;
	region: string;
	account: string;
	eventBusArn: string;
	eventBusName: string;
	environment: { [key: string]: string } | undefined;
	stackEventProcessorLambda: NodejsFunction;
	devMode: boolean | undefined;

	constructor(stepFunctionLifecycleRule: Rule, props: EventBridgeServiceProps) {
		const { feature, region, account, env, status, devMode } = props;
		this.feature = feature;
		this.region = region;
		this.account = account;
		const eventBus = this.getDefaultBus(feature, region, account);
		this.eventBusArn = eventBus.eventBusArn;
		this.eventBusName = eventBus.eventBusName;
		this.environment = env;
		this.status = status || '';
		this.devMode = devMode;

		this.stackEventProcessorLambda = this.createNodejsLambda(
			'EventProcessor',
			'event-processor',
			this.status,
		);
		eventBus.grantPutEventsTo(this.stackEventProcessorLambda);

		stepFunctionLifecycleRule.addTarget(
			new LambdaFunction(this.stackEventProcessorLambda, {
				maxEventAge: Duration.minutes(5),
				retryAttempts: 2,
			}),
		);
	}

	/**
	 * Creates a Node.js Lambda function.
	 * @param name - The name of the Lambda function.
	 * @param dirName - The status value for creating a unique Lambda function.
	 * @param status - The status value for creating a unique Lambda function. (optional)
	 * @returns The created Node.js Lambda function.
	 */
	createNodejsLambda(name: string, dirName: string, status?: string): NodejsFunction {
		const functionName = `${this.feature.baseStack.getFullName(`V1-${name}${status ? `-${status}` : ''}`)}`;

		const lambdaFunction = new NodejsFunction(this.feature.baseStack, functionName, {
			bundling: {
				keepNames: true,
				minify: false,
				nodeModules: [],
			},
			entry: join(
				__dirname,
				'..',
				'..',
				'lambda-functions',
				dirName + (status ? `-${status.toLowerCase()}` : ''),
				'handler.ts',
			),
			handler: 'main',
			runtime: Runtime.NODEJS_20_X,
			memorySize: this.devMode ? 512 : 1024,
			timeout: Duration.minutes(5),
			description: `This Lambda function handles state machine status changes for ${status}.`,
			environment: {
				...this.environment,
				HOME: '/tmp',
			},
		});

		return lambdaFunction;
	}

	/**
	 * Retrieves the default event bus for the specified feature, region, and account.
	 * If the event bus has not been initialized, it will be created and cached for future use.
	 * @param feature - The feature associated with the event bus.
	 * @param region - The AWS region.
	 * @param account - The AWS account ID.
	 * @returns The default event bus.
	 */
	getDefaultBus(feature: Feature, region: string, account: string): IEventBus {
		if (!EventBridgeService.eventBus) {
			EventBridgeService.eventBus = EventBus.fromEventBusArn(
				feature.baseStack,
				`default`,
				`arn:aws:events:${region}:${account}:event-bus/default`,
			);
		}
		return EventBridgeService.eventBus;
	}

	/**
	 * Gets the information of the event bus.
	 * @returns The event bus information.
	 */
	getEventBusInfo(): EventBusInfo {
		return {
			eventBusArn: this.eventBusArn,
			eventBusName: this.eventBusName,
		};
	}

	/**
	 * Retrieves the event lambda function associated with this event service.
	 * @returns The event lambda function.
	 */
	getEventLambdaFunction(): NodejsFunction {
		return this.stackEventProcessorLambda;
	}
}
