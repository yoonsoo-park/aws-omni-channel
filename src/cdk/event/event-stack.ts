import { Feature, Stack, StageableStackProps, TargetAccount } from '@ncino/aws-cdk';
import { StateMachineMonitor } from './statemachine-monitor';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Duration } from 'aws-cdk-lib';

export class EventStack extends Stack {
	public readonly eventTopic: sns.Topic;
	public readonly eventQueue: sqs.Queue;
	public readonly deadLetterQueue: sqs.Queue;

	constructor(feature: Feature, id: string, props: StageableStackProps) {
		super(feature, id, props);

		const targetAccount = TargetAccount.getInstance();

		// Create DLQ for failed messages
		this.deadLetterQueue = new sqs.Queue(this, 'EventDeadLetterQueue', {
			queueName: `${feature.getFullName('EventDLQ')}`,
			retentionPeriod: Duration.days(14),
		});

		// Create main event queue with DLQ configuration
		this.eventQueue = new sqs.Queue(this, 'EventQueue', {
			queueName: `${feature.getFullName('EventQueue')}`,
			visibilityTimeout: Duration.seconds(30),
			deadLetterQueue: {
				queue: this.deadLetterQueue,
				maxReceiveCount: 3,
			},
		});

		// Create SNS topic for event fan-out
		this.eventTopic = new sns.Topic(this, 'EventTopic', {
			topicName: `${feature.getFullName('EventTopic')}`,
		});

		// Subscribe the SQS queue to the SNS topic
		this.eventTopic.addSubscription(new subscriptions.SqsSubscription(this.eventQueue));

		// Initialize StateMachineMonitor
		new StateMachineMonitor(feature, targetAccount);
	}
}
