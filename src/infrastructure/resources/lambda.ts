import { NodejsFunction, NodejsFunctionProps, Stack } from '@ncino/aws-cdk';
import { Duration, Size } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Role } from 'aws-cdk-lib/aws-iam';
import { join } from 'node:path';
import { Architecture } from 'aws-cdk-lib/aws-lambda';

/**
 * All of the lambda function defined in this stack.
 * If you create a new lambda function, add it here.
 */
export interface NodeLambdaFunctions {
	dataModelDiffProcessLambda: NodejsFunction;
}

export class Lambda {
	/**
	 * The lambda functions defined in this stack.
	 */
	public readonly functions: NodeLambdaFunctions;
	private stack: Stack;
	private environment: { [key: string]: string };
	private properties: NodejsFunctionProps;
	private appTempLambdaProperties: NodejsFunctionProps;

	constructor(params: {
		stack: Stack;
		environment: { [key: string]: string };
		lambdaExecutionRole: Role;
	}) {
		this.stack = params.stack;
		const devMode = this.stack.getContext('devMode', 'false');

		//* 🌎 ******************************* 🌎 *//
		//* Define the env for all Lambdas below *//
		//* 🌎 ******************************* 🌎 *//
		this.environment = {
			...params.environment,
			HOME: '/tmp',
			LOG_LEVEL: devMode ? 'DEBUG' : 'INFO',
		};

		if (devMode.toLowerCase() !== 'true') {
			this.environment['enableTracing'] = 'true';
			this.environment['timestamp'] = String(Date.now());
		}
		//* 📖 ******************************** 📖 *//
		//* Define the default properties for all *//
		//* lambda functions in this stack below. *//
		//* 📖 ******************************** 📖 *//
		this.properties = {
			handler: 'main',
			memorySize: devMode ? 512 : 1024,
			role: params.lambdaExecutionRole,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.minutes(5),
		};

		this.appTempLambdaProperties = {
			architecture: Architecture.X86_64,
			ephemeralStorageSize: Size.mebibytes(1024),
		};

		//* 🏗️ ******************************* 🏗️ *//
		//* Create the lambda functions below    *//
		//* 🏗️ ******************************* 🏗️ *//
		this.functions = {
			dataModelDiffProcessLambda: this.createLambdaFunction({
				name: 'DataModelDiffProcessLambda',
				dirName: 'data-model-diff-process-lambda',
				props: this.appTempLambdaProperties,
			}),
		};
	}

	private createLambdaFunction(params: {
		name: string;
		/** the name of the lambda's folder in the lambda-functions dir */
		dirName: string;
		/** These override the default properties (`this.properties`).
		 * ! DO NOT set functionName or entry through props. They will get overridden.
		 * Use `name` and `dirName` params instead. */
		props?: NodejsFunctionProps;
	}): NodejsFunction {
		const functionName = `${this.stack.getFullName(`V1-${params.name}`)}`;

		return new NodejsFunction(this.stack, functionName, {
			...this.properties,
			...params.props,
			functionName,
			entry: join(__dirname, '..', '..', 'lambda-functions', params.dirName, 'handler.ts'),
			environment: {
				...this.environment,
				...params.props?.environment,
			},
		});
	}
}
