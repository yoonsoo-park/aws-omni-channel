import {
	StageableStack,
	Utility,
	Feature,
	StageableStackProps,
	TargetAccount,
} from '@ncino/aws-cdk';
import { Aws, Fn, Tags } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ComputeResources } from './compute-resource';
import { PythonLambda } from '../lambda/python-lambda';
import { version } from '../../../package.json';
import { AppTempBucket } from '../storage/bucket';

export class OmniChannelComputeStack extends StageableStack {
	appTemp_lambda: PythonLambda;
	trigger_lambda: PythonLambda;

	constructor(
		feature: Feature,
		kmsKeyArn: string,
		restApiId: string,
		id: string,
		props: StageableStackProps,
		environment: { [key: string]: string },
	) {
		super(feature, id, props);

		const stage: string = this.getContext('stage');
		const sf_api_version = feature.getContext('sf_api_version');
		let githubToken;
		const targetAccount = TargetAccount.getInstance();
		if (targetAccount.isManagedAccount()) {
			console.log('ℹ️ In production environment...');
			const secret = Secret.fromSecretAttributes(this, 'devopsBuildSecret', {
				secretPartialArn: `arn:aws:secretsmanager:${Aws.REGION}:${Fn.importValue(
					'ExportsForAccount-DevOpsAccountId',
				)}:secret:DevOpsBuildSecrets`,
			});
			githubToken = secret.secretValueFromJson('GITHUB_TOKEN').toString();
		} else {
			console.log('ℹ️ In non production environment...');
			githubToken = Utility.env('GITHUB_TOKEN');
		}

		//* 🚀 ******************************** 🚀 *
		//* Build OmniChannel S3 Bucket.              *
		//* 🚀 ******************************** 🚀 *
		const appTempBucketName =
			`OmniChannel-Bucket-${feature.getContext('suffix')}`.toLowerCase();
		const appTempBucket = new AppTempBucket(feature.baseStack, appTempBucketName);
		environment['BUCKET_NAME'] = appTempBucketName;
		environment['BUCKET_ARN'] = appTempBucket.bucketArn;
		feature.baseStack.lambdaExecutionRole.addToPolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				resources: [appTempBucket.bucketArn, `${appTempBucket.bucketArn}/*`],
				actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:PutObjectAcl'],
			}),
		);

		// //* 🚀 ******************************** 🚀 *
		// //* Build Python Lambdas.                  *
		// //* 🚀 ******************************** 🚀 *
		// const stateMachineName = `${feature.getFullName(`V1-OmniChannelStateMachine`)}-${stage}`;
		// console.log("OmniChannel State Machine Name:", stateMachineName);
		// const omniChannelStateMachineArn = `arn:aws:states:${this.targetAccount.getTargetRegion()}:${this.targetAccount.getTargetAccountId()}:stateMachine:${stateMachineName}`;

		// const pythonLambdas = new PythonLambda({
		// 	stack: this,
		// 	environment: {
		// 		...environment,
		// 		githubToken,
		// 		sf_api_version,
		// 		kmsKeyArn,
		// 		restApiId,
		// 		omniChannelStateMachineArn,
		// 	},
		// });

		//* 🏗️ ******************************** 🏗️ *//
		//* Build state machine. node lambdas.    *//
		//* inject python lambdas.                *//
		//* 🏗️ ******************************** 🏗️ *//
		new ComputeResources({
			feature,
			environment,
			stack: this,
		});

		Tags.of(this).add('env', feature.getContext('suffix'));
		Tags.of(this).add('version', version);
	}
}
