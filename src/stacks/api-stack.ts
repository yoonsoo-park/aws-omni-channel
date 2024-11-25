import { Tags } from 'aws-cdk-lib';
import { App, Stack, StackConfig, Utility } from '@ncino/aws-cdk';
import { version } from '../../package.json';
import { AppTempApiGateway } from '../infrastructure/resources/api-gateway';
import { AppTempKey } from '../infrastructure/resources/kms-key';

export class AppTempApiStack extends Stack {
	restApiId: string;
	kmsKeyArn: string;

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

		// Create KmsKey
		const kmsKey = new AppTempKey(this);
		this.kmsKeyArn = kmsKey.attrArn;

		// Create Api Gateway
		const apiGateway = new AppTempApiGateway(this);
		this.restApiId = apiGateway.restApiId;

		// add env tag
		Tags.of(this).add('env', scope.getContext('suffix'));
		Tags.of(this).add('version', version);
	}
}
