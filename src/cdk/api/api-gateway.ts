import { Stack, Utility } from '@ncino/aws-cdk';
import { ApiGatewayDevops, RestApiMethodType } from '@ncino/devops-deploy-infrastructure';
import {
	AuthorizationType,
	MethodResponse,
	IntegrationResponse,
	JsonSchemaVersion,
	JsonSchemaType,
	Stage,
	IntegrationType,
	Integration,
	CognitoUserPoolsAuthorizer,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Role, ServicePrincipal, PolicyStatement, Effect, User } from 'aws-cdk-lib/aws-iam';
import { Aws } from 'aws-cdk-lib';

export class OmniChannelApiGateway extends ApiGatewayDevops {
	constructor(stack: Stack, userPool: UserPool) {
		super(stack, stack.getFullName('ApiGateway'), {
			apiGatewayDescription: 'API Gateway for OmniChannel',
			endpointExportName: `OmniChannel-API-endpoint-${stack.getContext('suffix')}`,
		});

		// Create IAM Resources
		const omniChannelRole = new Role(stack, stack.getFullName('role'), {
			assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
		});
		const omniChannelUser = new User(stack, stack.getFullName('user'), {
			userName: `OmniChannel-user-${stack.getContext('suffix')}`,
		});

		const allowInvokeApi = new PolicyStatement({
			actions: ['execute-api:Invoke'],
			effect: Effect.ALLOW,
			resources: [`arn:aws:execute-api:${Aws.REGION}:${Aws.ACCOUNT_ID}:${this.restApiId}/*`],
		});

		const allowInvokeLambda = new PolicyStatement({
			actions: ['lambda:InvokeFunction'],
			effect: Effect.ALLOW,
			resources: [`*`],
		});

		// Assign Permissions
		omniChannelUser.addToPolicy(allowInvokeApi);
		omniChannelRole.addToPolicy(allowInvokeLambda);

		// Create Responses
		const integrationResponses = this.buildIntegrationResponses();
		const methodResponses = this.buildMethodResponses();

		// Create Resources
		const triggerResource = this.addResource(this.root, 'trigger');

		// Create Deployment
		const deployment = this.addDeployment('OmniChannel API deployment');

		// Create Blue Stage
		const blueStage: Stage = this.addDeploymentStage(
			stack.getFullName('BlueStage'),
			'blue',
			deployment,
			{
				TriggerLambda: `OmniChannel-OmniChannelTriggerLambda-${this.stack.getContext('suffix')}-blue`,
			},
		);

		// Create Green Stage
		const greenStage: Stage = this.addDeploymentStage(
			stack.getFullName('GreenStage'),
			'green',
			deployment,
			{
				TriggerLambda: `OmniChannel-OmniChannelTriggerLambda-${this.stack.getContext('suffix')}-green`,
			},
		);

		const triggerModel = this.addModel('RequestModel', {
			contentType: 'application/cdkjson',
			modelName: 'RequestModel',
			schema: {
				schema: JsonSchemaVersion.DRAFT4,
				title: 'triggerOmniChannel',
				type: JsonSchemaType.OBJECT,
				properties: {
					packages: { type: JsonSchemaType.ARRAY },
					name: { type: JsonSchemaType.STRING },
					id: { type: JsonSchemaType.STRING },
				},
			},
		});

		const integrationOptions = {
			integrationResponses,
			requestTemplates: undefined,
			requestParameters: {
				'integration.request.path.id': 'method.request.path.id',
				'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
			},
		};
		const stageVariableLambdaName = 'TriggerLambda';
		const lambdaIntegration = new Integration({
			type: IntegrationType.AWS,
			integrationHttpMethod: RestApiMethodType.POST,
			uri: `arn:aws:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:\${stageVariables.${stageVariableLambdaName}}/invocations`,
			options: integrationOptions,
		});

		// Create Cognito Authorizer
		const authorizer = new CognitoUserPoolsAuthorizer(stack, 'OmniChannelAuthorizer', {
			cognitoUserPools: [userPool],
		});

		// Create Method
		triggerResource.addMethod(RestApiMethodType.POST, lambdaIntegration, {
			methodResponses,
			authorizationType: AuthorizationType.COGNITO,
			authorizer,
			requestParameters: { 'method.request.path.id': true },
			requestModels: { 'application/json': triggerModel },
		});

		// This is only used upon initial deployment
		this.deploymentStage = blueStage;

		if (Utility.isProductionEnvironment()) {
			const targetEnv: string = stack.getContext('suffix') === 'tooling-prod' ? 'prod' : 'qa';
			const domain = `us-east-1.internal-${targetEnv}.ncino.cloud`;
			this.createBasePathMappings(
				this.restApiId,
				'OmniChannel',
				blueStage,
				greenStage,
				'devops',
				domain,
			);
		}
		// Create Outputs
		this.outputApiId(
			this.restApiId,
			`OmniChannel-RestApi-Id`,
			`OmniChannel-RestApiId-${this.stack.getContext('suffix')}`,
		);
	}

	private buildMethodResponses(): MethodResponse[] {
		const methodResponses: MethodResponse[] = [
			{
				statusCode: '200',
			},
			{
				statusCode: '400',
			},
			{
				statusCode: '500',
			},
		];
		return methodResponses;
	}

	private buildIntegrationResponses(): IntegrationResponse[] {
		const integrationResponses: IntegrationResponse[] = [
			{
				statusCode: '200',
			},
			{
				selectionPattern: '[4][0-9][0-9]',
				statusCode: '400',
			},
			{
				selectionPattern: '[5][0-9][0-9]',
				statusCode: '500',
			},
		];
		return integrationResponses;
	}
}
