import { Stack } from '@ncino/aws-cdk';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { PythonLambdaFunctions } from '../lambda/python-lambda';
import { NodeLambdaFunctions } from '../lambda/lambda';

export class AppTempStateMachine {
	public static config = {
		defaultWaitTime: 15,
		defaultLambdaOutputPath: '$.Payload',
	};
	private stack: Stack;
	public stateMachine: sfn.StateMachine;
	public stateMachineName: string;

	constructor(
		stack: Stack,
		name: string,
		lambdaFunctions: NodeLambdaFunctions,
		pythonLambdaFunctions?: PythonLambdaFunctions,
	) {
		this.stack = stack;
		this.stateMachineName = name;

		// Create a simple pass state as placeholder
		const startState = new sfn.Pass(this.stack, 'StartState', {
			comment: 'Initial state of the state machine',
		});

		// Create the state machine with the placeholder state
		this.stateMachine = new sfn.StateMachine(this.stack, this.stateMachineName, {
			definition: startState,
			stateMachineName: this.stateMachineName,
			stateMachineType: sfn.StateMachineType.STANDARD,
		});
	}
}
