import { Tags } from 'aws-cdk-lib';
import { App, Stack, StackConfig, Utility } from '@ncino/aws-cdk';
import { version } from '../../../package.json';
import { OmniChannelApiGateway } from './api-gateway';
import { AppTempKey } from '../security/kms/kms-key';
import { CognitoAuth } from '../auth/cognito-auth';

export class OmniChannelApiStack extends Stack {
	restApiId: string;
	kmsKeyArn: string;
	cognitoAuth: CognitoAuth;

	constructor(scope: App, props?: StackConfig) {
		super(
			scope,
			Utility.createResourceName(
				'ApiStack',
				scope.getContext('suffix'),
				scope.getContext('appName'),
			),
			props,
		);

		// Create Cognito resources
		this.cognitoAuth = new CognitoAuth(this, 'OmniChannel', {
			domainPrefix: `omnichannel-${this.getContext('suffix')}`,
			// SSO configuration can be added here when available
		});

		// Create KmsKey
		const kmsKey = new AppTempKey(this);
		this.kmsKeyArn = kmsKey.attrArn;

		// Create Api Gateway with Cognito Authorizer
		const apiGateway = new OmniChannelApiGateway(this, this.cognitoAuth.userPool);
		this.restApiId = apiGateway.restApiId;

		// Add env tag
		Tags.of(this).add('env', scope.getContext('suffix'));
		Tags.of(this).add('version', version);
	}
}
