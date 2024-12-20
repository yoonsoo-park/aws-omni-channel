import {
	StageableStack,
	Utility,
	Feature,
	StageableStackProps,
	TargetAccount,
} from '@ncino/aws-cdk';

// aws imports
import { Aws, Fn, Tags, RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';

// local imports
import { version } from '../../../package.json';
import { StateMachines } from './state-machines/state-machines';
import { PythonLambda } from '../lambda/python-lambda';
import { AppTempBucket } from '../storage/bucket';

export class OmniChannelComputeStack extends StageableStack {
	appTemp_lambda: PythonLambda;
	trigger_lambda: PythonLambda;
	userContextTable: Table;
	dbsApi: appsync.GraphqlApi;
	userContextStateMachine: StateMachine;

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

		//* 🏗️ ******************************** 🏗️ *//
		//* Build DBS Components                    *//
		//* 🏗️ ******************************** 🏗️ *//

		// Create DynamoDB table for user context
		this.userContextTable = new Table(this, 'UserContextTable', {
			tableName: `${feature.getFullName('UserContext')}-${stage}`,
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'contextType', type: AttributeType.STRING },
			timeToLiveAttribute: 'ttl',
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.RETAIN,
		});

		// Create AppSync API for real-time updates
		this.dbsApi = new appsync.GraphqlApi(this, 'DataBridgeAPI', {
			name: `${feature.getFullName('DataBridge')}-${stage}`,
			schema: appsync.SchemaFile.fromAsset('src/graphql/schema.graphql'),
			authorizationConfig: {
				defaultAuthorization: {
					authorizationType: appsync.AuthorizationType.IAM,
				},
			},
			logConfig: {
				fieldLogLevel: appsync.FieldLogLevel.ERROR,
				excludeVerboseContent: true,
			},
			xrayEnabled: true,
		});

		// Add these resources to environment for lambda functions
		environment['USER_CONTEXT_TABLE'] = this.userContextTable.tableName;
		environment['DBS_API_URL'] = this.dbsApi.graphqlUrl;
		environment['DBS_API_ID'] = this.dbsApi.apiId;

		//* 🏗️ ******************************** 🏗️ *//
		//* Build state machine. node lambdas.    *//
		//* inject python lambdas.                *//
		//* 🏗️ ******************************** 🏗️ *//
		const stateMachines = new StateMachines({
			feature,
			environment,
			stack: this,
		});

		// Add permissions for the state machine to access DynamoDB
		this.userContextTable.grantReadWriteData(stateMachines.getUserContextStateMachine());

		// Add permissions for the state machine to invoke AppSync API
		this.dbsApi.grantMutation(stateMachines.getUserContextStateMachine());

		Tags.of(this).add('env', feature.getContext('suffix'));
		Tags.of(this).add('version', version);
	}
}
