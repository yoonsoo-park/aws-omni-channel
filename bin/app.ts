import { ApiStageType, Feature, StageableStackProps, Utility } from '@ncino/aws-cdk';
import { AppTempApiStack } from '../src/stacks/api-stack';
import { DeployStack } from '../deploy/deploy-stack';
import { AppTempComputeStack } from '../src/stacks/compute-stack';
import { EventStack } from '../src/stacks/event-stack';

const deployAccount = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const deployRegion = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION;

const feature = new Feature({
	name: 'AppTemplate',
	description: '',
});
const stageName = feature.getContext('stage') || ApiStageType.BLUE;
const stackProps: StageableStackProps = {
	description: 'Required. Contains compute resources for AppTemplate.',
	env: { account: process.env.AWS_ACCOUNT, region: process.env.REGION },
	stageName,
};

if (Utility.isDevopsAccount()) {
	new DeployStack(feature);
} else {
	console.log('🛠  API Stack');
	const apiStack: AppTempApiStack = new AppTempApiStack(feature, stackProps);

	console.log('🛠  Compute Stack');
	new AppTempComputeStack(
		feature,
		apiStack.kmsKeyArn,
		apiStack.restApiId,
		`${feature.getFullName('ComputeStack')}-${stageName}`,
		stackProps,
		{},
	);

	console.log('🛠  Event Stack');
	const eventStack = new EventStack(
		feature,
		`${feature.getFullName('EventStack')}`,
		{
			description: 'Required. Contains EventBridge resources for State Provisioning.',
			env: {
				account: deployAccount,
				region: deployRegion,
			},
			stageName,
		},
		{},
	);
	feature.setStack('eventStack', eventStack);
	feature.iamStack.addDependency(eventStack);
}

feature.synth();
