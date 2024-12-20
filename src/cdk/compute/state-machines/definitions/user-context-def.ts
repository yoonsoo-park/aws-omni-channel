import { Chain, Choice, Condition, StateMachine, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { LogLevel } from 'aws-cdk-lib/aws-stepfunctions';
import { NodeLambdaFunctions } from '../../../lambda/node-lambda';

interface UserContextStateMachineProps {
	lambdaFunctions: NodeLambdaFunctions;
	logGroup: LogGroup;
}

export class UserContextStateMachine extends Construct {
	public readonly stateMachine: StateMachine;
	public readonly stateMachineName: string;
	constructor(scope: Construct, id: string, props: UserContextStateMachineProps) {
		super(scope, id);
		this.stateMachineName = id;
		// Create success state that both paths will use
		const succeed = new Succeed(this, 'ContextUpdated');

		// Define state machine tasks
		const validateToken = new LambdaInvoke(this, 'ValidateToken', {
			lambdaFunction: props.lambdaFunctions.validateTokenLambda,
			outputPath: '$.Payload',
		});

		const checkCache = new LambdaInvoke(this, 'CheckCache', {
			lambdaFunction: props.lambdaFunctions.checkCacheLambda,
			outputPath: '$.Payload',
		});

		const fetchProductAccess = new LambdaInvoke(this, 'FetchProductAccess', {
			lambdaFunction: props.lambdaFunctions.fetchProductAccessLambda,
			outputPath: '$.Payload',
		});

		const updateContext = new LambdaInvoke(this, 'UpdateContext', {
			lambdaFunction: props.lambdaFunctions.updateContextLambda,
			outputPath: '$.Payload',
		});

		// Connect fetch product access to update context
		fetchProductAccess.next(updateContext);

		// Connect update context to succeed state
		updateContext.next(succeed);

		// Define choice states with simple boolean condition
		const isCacheValid = new Choice(this, 'IsCacheValid')
			.when(Condition.booleanEquals('$.cacheValid', true), updateContext)
			.otherwise(fetchProductAccess);

		// Define the main flow
		const definition = Chain.start(validateToken).next(checkCache).next(isCacheValid);

		// Create the state machine
		this.stateMachine = new StateMachine(this, this.stateMachineName, {
			definition,
			stateMachineName: this.stateMachineName,
			logs: {
				destination: props.logGroup,
				level: LogLevel.ALL,
				includeExecutionData: true,
			},
		});
	}
}
