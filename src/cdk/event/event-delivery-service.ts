import { Feature } from '@ncino/aws-cdk';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from '@ncino/aws-cdk';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration } from 'aws-cdk-lib';

export class EventDeliveryService {
	private readonly feature: Feature;
	private readonly eventProcessor: NodejsFunction;

	constructor(feature: Feature, eventQueue: sqs.Queue, deadLetterQueue: sqs.Queue) {
		this.feature = feature;

		// Create Lambda function to process events
		this.eventProcessor = new NodejsFunction(this.feature.baseStack, 'EventProcessor', {
			entry: 'src/lambda-functions/event-processor/handler.ts',
			handler: 'handler',
			timeout: Duration.minutes(5),
			environment: {
				DLQ_URL: deadLetterQueue.queueUrl,
				EVENT_QUEUE_URL: eventQueue.queueUrl,
			},
		});

		// Grant permissions
		eventQueue.grantConsumeMessages(this.eventProcessor);
		deadLetterQueue.grantSendMessages(this.eventProcessor);

		// Add SQS event source to Lambda
		this.eventProcessor.addEventSource(
			new SqsEventSource(eventQueue, {
				batchSize: 10,
				maxBatchingWindow: Duration.seconds(30),
			}),
		);
	}

	public getEventProcessor(): NodejsFunction {
		return this.eventProcessor;
	}
}
