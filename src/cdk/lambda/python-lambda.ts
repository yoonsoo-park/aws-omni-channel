import { Function, LambdaLayer, Stack } from '@ncino/aws-cdk';
import { CfnFunction, Code, Permission, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration, Size, Tags, Aws } from 'aws-cdk-lib';
import { PolicyStatement, Effect, ServicePrincipal, Role } from 'aws-cdk-lib/aws-iam';

export interface PythonLambdaFunctions {
	appTempCompute: Function;
	triggerStepFunction: Function;
	salesforceLambda: Function;
}

export class PythonLambda {
	public readonly functions: PythonLambdaFunctions;
	private stack: Stack;
	private environment: { [key: string]: string };
	private properties: any;

	constructor(params: { stack: Stack; environment: { [key: string]: string } }) {
		this.stack = params.stack;
		this.environment = params.environment;

		// Define python lambda properties here
		this.properties = {
			// Add default properties if needed
		};

		const appTempDevopsLibLambdaLayer = LambdaLayer.getExistingLayer(
			this.stack,
			this.stack.getContext('devopsLibLayer'),
			`appTempDevopsLibLambdaLayer`,
		);

		//* 🌎 ******************************* 🌎 *//
		//* Define the Python Lambdas below      *//
		//* 🌎 ******************************* 🌎 *//
		const appTempCompute = this.createPythonLambdaFunction({
			name: 'AppTempCompute',
			codePath: 'src/app_temp/compute',
			handler: 'app_temp_lambda.lambda_handler',
			environment: {
				GITHUB_TOKEN: this.environment.githubToken,
				SF_API_VERSION: this.environment.sf_api_version,
				BUCKET_NAME: this.environment.BUCKET_NAME,
			},
			memorySize: 8960,
			ephemeralStorageSize: Size.mebibytes(10240),
			layers: [
				LambdaLayer.fromLayerVersionArn(
					this.stack,
					'gitLambdaLayer',
					this.stack.getContext('gitLayer'),
				),
				appTempDevopsLibLambdaLayer,
			],
			timeout: Duration.minutes(15),
			needsS3Permission: true,
		});
		appTempCompute.role.addToPolicy(
			new PolicyStatement({
				actions: ['secretsmanager:GetSecretValue'],
				effect: Effect.ALLOW,
				resources: [
					`arn:aws:secretsmanager:us-east-1:182594598204:secret:DevOpsGitHubAccessToken-yeFTHG`,
				],
				sid: 'secretsmanager',
			}),
		);

		// Salesforce Lambda
		const salesforceLambda = this.createPythonLambdaFunction({
			name: 'SalesforceLambda',
			codePath: 'src/lambda-functions/salesforce-lambda',
			handler: 'salesforce_lambda.lambda_handler',
			environment: {
				PLM_CREDS: JSON.stringify(this.environment.plmCreds),
				PLM_IS_SANDBOX: this.environment.plmIsSandbox,
				SF_API_VERSION: this.environment.sf_api_version,
			},
			memorySize: 2048,
			ephemeralStorageSize: Size.mebibytes(1024),
			layers: [appTempDevopsLibLambdaLayer],
			timeout: Duration.minutes(15),
			needsS3Permission: true,
		});
		salesforceLambda.role.addToPolicy(
			new PolicyStatement({
				actions: ['secretsmanager:GetSecretValue'],
				effect: Effect.ALLOW,
				resources: [
					`arn:aws:secretsmanager:us-east-1:182594598204:secret:DevOpsGitHubAccessToken-yeFTHG`,
				],
				sid: 'secretsmanager',
			}),
		);

		const triggerStepFunction = this.createPythonLambdaFunction({
			name: 'AppTempTriggerLambda',
			codePath: 'src/lambda-functions/trigger_lambda',
			handler: 'trigger_lambda.lambda_handler',
			environment: {
				OMNI_CHANNEL_STATE_MACHINE_ARN: this.environment.omniChannelStateMachineArn,
			},
			kmsKeyArn: this.environment.kmsKeyArn,
			restApiId: this.environment.restApiId,
			restApiPath: '/*/POST/trigger',
		});

		triggerStepFunction.role.addToPolicy(
			new PolicyStatement({
				actions: ['states:StartExecution'],
				effect: Effect.ALLOW,
				resources: [this.environment.omniChannelStateMachineArn],
				sid: 'StartStateMachine',
			}),
		);

		this.functions = {
			appTempCompute: appTempCompute.function,
			triggerStepFunction: triggerStepFunction.function,
			salesforceLambda: salesforceLambda.function,
		};
	}

	private createPythonLambdaFunction(params: {
		name: string;
		codePath: string;
		handler: string;
		environment?: { [key: string]: string };
		kmsKeyArn?: string;
		restApiId?: string;
		restApiPath?: string;
		memorySize?: number;
		ephemeralStorageSize?: Size;
		layers?: any[];
		timeout?: Duration;
		needsS3Permission?: boolean;
	}): { function: Function; role: Role } {
		const role = new Role(this.stack, `${params.name}Role`, {
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
		});

		const functionInstance = new Function(
			this.stack,
			`${this.stack.getFullName(params.name)}`,
			{
				code: Code.fromAsset(params.codePath),
				handler: params.handler,
				runtime: Runtime.PYTHON_3_9,
				environment: params.environment,
				memorySize: params.memorySize,
				ephemeralStorageSize: params.ephemeralStorageSize,
				layers: params.layers,
				timeout: params.timeout,
				role,
			},
		);

		if (params.kmsKeyArn) {
			const cfnFunction = functionInstance.node.defaultChild as CfnFunction;
			cfnFunction.kmsKeyArn = params.kmsKeyArn;
		}

		if (params.restApiId && params.restApiPath) {
			functionInstance.addPermission(
				this.stack.getFullName('packageVersionsPostV1'),
				this.buildLambdaPermissions(params.restApiId, params.restApiPath),
			);
		}

		//cloudwatch logs permissions
		role.addToPolicy(
			new PolicyStatement({
				actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
				resources: ['*'],
			}),
		);

		if (params.needsS3Permission) {
			role.addToPolicy(
				new PolicyStatement({
					effect: Effect.ALLOW,
					resources: [this.environment.BUCKET_ARN, `${this.environment.BUCKET_ARN}/*`],
					actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:PutObjectAcl'],
				}),
			);
		}

		Tags.of(functionInstance).add('lambdaName', params.name);

		return { function: functionInstance, role };
	}

	private buildLambdaPermissions(restApiId: string, path: string): Permission {
		return {
			action: 'lambda:InvokeFunction',
			principal: new ServicePrincipal('apigateway.amazonaws.com'),
			sourceArn: `arn:aws:execute-api:${Aws.REGION}:${Aws.ACCOUNT_ID}:${restApiId}${path}`,
		};
	}
}
