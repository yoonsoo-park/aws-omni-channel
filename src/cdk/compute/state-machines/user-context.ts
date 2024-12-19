import { Chain, Choice, Condition, StateMachine, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { LogLevel } from 'aws-cdk-lib/aws-stepfunctions';

interface UserContextStateMachineProps {
	validateTokenFn: Function;
	checkCacheFn: Function;
	fetchProductAccessFn: Function;
	updateContextFn: Function;
	logGroup: LogGroup;
}

export class UserContextStateMachine extends Construct {
	public readonly stateMachine: StateMachine;

	constructor(scope: Construct, id: string, props: UserContextStateMachineProps) {
		super(scope, id);

		// Define state machine tasks
		const validateToken = new LambdaInvoke(this, 'ValidateToken', {
			lambdaFunction: props.validateTokenFn,
			outputPath: '$.Payload',
		});

		const checkCache = new LambdaInvoke(this, 'CheckCache', {
			lambdaFunction: props.checkCacheFn,
			outputPath: '$.Payload',
		});

		const fetchProductAccess = new LambdaInvoke(this, 'FetchProductAccess', {
			lambdaFunction: props.fetchProductAccessFn,
			outputPath: '$.Payload',
		});

		const updateContext = new LambdaInvoke(this, 'UpdateContext', {
			lambdaFunction: props.updateContextFn,
			outputPath: '$.Payload',
		});

		// Define choice states
		const isCacheValid = new Choice(this, 'IsCacheValid')
			.when(Condition.booleanEquals('$.cacheValid', true), updateContext)
			.otherwise(fetchProductAccess);

		// Define the main flow
		const definition = Chain.start(validateToken)
			.next(checkCache)
			.next(isCacheValid)
			.next(new Succeed(this, 'ContextUpdated'));

		// Create the state machine
		this.stateMachine = new StateMachine(this, 'StateMachine', {
			definition,
			logs: {
				destination: props.logGroup,
				level: LogLevel.ALL,
				includeExecutionData: true,
			},
		});
	}
}
