import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';
import { Feature, StageableStack, StageableStackProps } from '@ncino/aws-cdk';

export class EventRouterStack extends StageableStack {
	constructor(feature: Feature, id: string, props: StageableStackProps) {
		super(feature, id, props);

		// Create Dead Letter Queue for failed events
		const dlq = new sqs.Queue(this, 'EventRouterDLQ', {
			queueName: 'event-router-dlq',
			retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
		});

		// Create the Event Router Lambda
		const eventRouterFn = new lambda.Function(this, 'EventRouterFunction', {
			runtime: lambda.Runtime.NODEJS_18_X,
			handler: 'index.handler',
			code: lambda.Code.fromAsset(
				path.join(__dirname, '../../lambda-functions/event-router'),
			),
			environment: {
				DLQ_URL: dlq.queueUrl,
			},
			deadLetterQueueEnabled: true,
			deadLetterQueue: dlq,
			timeout: cdk.Duration.seconds(30),
			memorySize: 256,
		});

		// Create EventBridge bus
		const eventBus = new events.EventBus(this, 'DataBridgeEventBus', {
			eventBusName: 'data-bridge-event-bus',
		});

		// Create default rule to process all events
		new events.Rule(this, 'DefaultEventRule', {
			eventBus,
			ruleName: 'process-all-events',
			description: 'Routes all events to the event router lambda',
			eventPattern: {
				// Match all events on this event bus
				source: ['*'], // Matches any source
				detailType: ['*'], // Matches any detail-type
			},
			targets: [new targets.LambdaFunction(eventRouterFn)],
		});

		// Grant permissions
		eventBus.grantPutEventsTo(eventRouterFn);
		dlq.grantSendMessages(eventRouterFn);
	}
}
