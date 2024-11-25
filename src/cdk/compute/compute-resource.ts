import { Feature, Stack, TargetAccount } from '@ncino/aws-cdk';
import { AppTempStateMachine } from './state-machine';
import { Lambda, NodeLambdaFunctions } from '../lambda/lambda';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { PythonLambdaFunctions } from '../lambda/python-lambda';

export class ComputeResources {
	public pythonLambdas?: PythonLambdaFunctions;
	private lambdaFunctions: NodeLambdaFunctions;
	private stack: Stack;
	private stateMachineName: string;
	private stateMachineArn: string;

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
		this.stateMachineName = `${feature.getFullName(`V1-OmniChannelStateMachine`)}-${stageName}`;
		this.stateMachineArn = `arn:aws:states:${targetAccount.getTargetRegion()}:${targetAccount.getTargetAccountId()}:stateMachine:${this.stateMachineName}`;

		//* Declare global environment variables here:
		environment['OMNI_CHANNEL_STATE_MACHINE_ARN'] = this.stateMachineArn;
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
			this.stateMachineName,
			this.lambdaFunctions,
			this.pythonLambdas,
		);
	}

	public getStateMachineArn() {
		return this.stateMachineArn;
	}
}
