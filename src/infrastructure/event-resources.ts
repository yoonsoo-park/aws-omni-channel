import { Feature, NodejsFunction, TargetAccount } from '@ncino/aws-cdk';
import { Fn } from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { buildResourceARN } from '../lib/utility/aws-utils';
import { EventBridgeService, IEventService } from './resources/event-service';

/**
 * Represents the EventResources class.
 * This class is responsible for defining event resources and configuring event handling.
 */
export class EventResources {
	/**
	 * Creates an instance of EventResources.
	 * @param feature - The feature object.
	 * @param targetAccount - The target account object.
	 */
	constructor(feature: Feature, targetAccount: TargetAccount) {
		const stateMachinePrefix = buildResourceARN({
			stack: feature.baseStack,
			serviceName: 'states',
			resourcePrefix: 'stateMachine:',
			resourceName: `V1-AppTemplateStateMachine`,
		});

		//* 1️⃣ ******************************* 1️⃣ *//
		//*  Define Event Resources Below   *//
		//* 1️⃣ ******************************* 1️⃣ *//
		const stack = feature.baseStack;
		const eventProcessorLambda: NodejsFunction[] = [];
		let eventBridgeService: IEventService;
		const environment: { [key: string]: string } = {};
		environment['APP_NAME'] = feature.getContext('appName');
		environment['APP_SUFFIX'] = feature.getContext('suffix');

		console.debug('APP_NAME:', environment['APP_NAME']);
		console.debug('APP_SUFFIX:', environment['APP_SUFFIX']);

		// Collecting statuses for the Step Function: FAILED only
		// Currently, we do not collect (RUNNING, TIMED_OUT, 'SUCCEEDED', and ABORTED)
		const statuses = ['FAILED'];
		statuses.forEach((status) => {
			const rule = new Rule(feature.baseStack, `${status}Rule`, {
				description: `This rule triggers when the state machine is in ${status} status.`,
				eventPattern: {
					source: ['aws.states'],
					detail: {
						status: [status],
						stateMachineArn: [
							{
								prefix: stateMachinePrefix,
							},
						],
					},
				},
			});

			eventBridgeService = new EventBridgeService(rule, {
				feature,
				region: targetAccount.getTargetRegion(),
				account: targetAccount.getTargetAccountId(),
				env: environment,
				status,
			});
			eventProcessorLambda.push(eventBridgeService.getEventLambdaFunction());
		});

		// Grant permissions to the Lambda function to call states:GetExecutionHistory and interact with DynamoDB
		eventProcessorLambda.forEach((lambda) => {
			lambda.addToRolePolicy(
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['states:GetExecutionHistory'],
					resources: [
						`arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:stateMachine:${feature.getContext('appName')}-*`,
						`arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:execution:${feature.getContext('appName')}-*`,
					],
				}),
			);

			lambda.addToRolePolicy(
				new PolicyStatement({
					actions: ['sts:AssumeRole'],
					resources: [
						`arn:aws:iam::${Fn.importValue(
							'ExportsForAccount-DevOpsAccountId',
						)}:role/EnvProvCrossAccountRole`,
					],
					effect: Effect.ALLOW,
				}),
			);
		});
	}
}
