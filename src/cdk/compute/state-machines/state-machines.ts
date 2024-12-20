import { Feature, Stack, TargetAccount } from '@ncino/aws-cdk';
import { AppTempStateMachine } from './definitions/temp-def';
import { Lambda, NodeLambdaFunctions } from '../../lambda/node-lambda';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { PythonLambdaFunctions } from '../../lambda/python-lambda';
import { UserContextStateMachine } from './definitions/user-context-def';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';

export class StateMachines {
	public pythonLambdas?: PythonLambdaFunctions;
	public readonly lambdaFunctions: NodeLambdaFunctions;
	private stack: Stack;
	private tempStateMachineName: string;
	private tempStateMachineArn: string;
	private userContextStateMachineName: string;
	private userContextStateMachineArn: string;
	public userContextStateMachine: StateMachine;

	constructor(params: {
		feature: Feature;
		environment: { [key: string]: string };
		stack: Stack;
		pythonLambdas?: PythonLambdaFunctions;
	}) {
		const { feature, environment, stack } = params;

		this.stack = stack;
		this.pythonLambdas = params.pythonLambdas;

		const stageName = feature.getContext('stage');
		const targetAccount = TargetAccount.getInstance();

		//* Create log group for user context state machine
		const logGroup = new LogGroup(this.stack, 'UserContextStateMachineLogs', {
			logGroupName: `/aws/vendedlogs/states/${feature.getFullName('UserContextStateMachine')}-${stageName}`,
			retention: RetentionDays.ONE_MONTH,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		this.tempStateMachineName = `${feature.getFullName(`V1-OmniChannelTempStateMachine`)}-${stageName}`;
		this.tempStateMachineArn = `arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:stateMachine:${this.tempStateMachineName}`;

		this.userContextStateMachineName = `${feature.getFullName(`V1-OmniChannelUserContextStateMachine`)}-${stageName}`;
		this.userContextStateMachineArn = `arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:stateMachine:${this.userContextStateMachineName}`;

		//* Declare global environment variables here:
		environment['OMNI_CHANNEL_TEMP_STATE_MACHINE_ARN'] = this.tempStateMachineArn;
		environment['USER_CONTEXT_STATE_MACHINE_LOG_GROUP_ARN'] = logGroup.logGroupArn;
		environment['USER_CONTEXT_STATE_MACHINE_ARN'] = this.userContextStateMachineArn;
		environment['VERSION'] = 'V1';

		this.lambdaFunctions = new Lambda({
			stack,
			environment,
			lambdaExecutionRole: feature.baseStack.lambdaExecutionRole,
		}).functions;

		Object.values(this.lambdaFunctions).forEach((lambdaFunction) => {
			feature.authorizeFunction(lambdaFunction);
		});
		feature.baseStack.lambdaExecutionRole.attachInlinePolicy(
			new Policy(stack, `${feature.getFullName('StepFunctionExecutionPolicy')}`, {
				statements: [
					new PolicyStatement({
						actions: [
							'states:StartExecution',
							'states:DescribeExecution',
							'states:GetExecutionHistory',
						],
						effect: Effect.ALLOW,
						resources: [
							`arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:stateMachine:${stack.getContext('appName')}-*`,
							`arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:execution:${stack.getContext('appName')}-*`,
						],
					}),
				],
			}),
		);

		new AppTempStateMachine(
			this.stack,
			this.tempStateMachineName,
			this.lambdaFunctions,
			this.pythonLambdas,
		);

		this.userContextStateMachine = new UserContextStateMachine(
			this.stack,
			this.userContextStateMachineName,
			{
				lambdaFunctions: this.lambdaFunctions,
				logGroup,
			},
		).stateMachine;
	}

	public getUserContextStateMachine(): StateMachine {
		return this.userContextStateMachine;
	}
}
