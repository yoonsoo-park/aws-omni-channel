import { ApiStageType, Feature, StageableStackProps, Utility } from '@ncino/aws-cdk';
import { DeployStack } from '../deploy/deploy-stack';
import { OmniChannelApiStack } from '../src/cdk/api/api-stack';
import { EventStack } from '../src/cdk/event/event-stack';
import { OmniChannelComputeStack } from '../src/cdk/compute/compute-stack';
import { EventRouterStack } from '../src/cdk/event/event-router-stack';

const deployAccount = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const deployRegion = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION;

const feature = new Feature({
	name: 'OmniChannel',
	description: '',
});
const stageName = feature.getContext('stage') || ApiStageType.BLUE;
const stackProps: StageableStackProps = {
	description: 'Required. Contains compute resources for OmniChannel.',
	env: { account: process.env.AWS_ACCOUNT, region: process.env.REGION },
	stageName,
};

if (Utility.isDevopsAccount()) {
	new DeployStack(feature);
} else {
	console.log('🛠  API Stack');
	const apiStack: OmniChannelApiStack = new OmniChannelApiStack(feature, stackProps);

	console.log('🛠  Compute Stack');
	const computeStack = new OmniChannelComputeStack(
		feature,
		apiStack.kmsKeyArn,
		apiStack.restApiId,
		`${feature.getFullName('ComputeStack')}-${stageName}`,
		stackProps,
		{},
	);
	computeStack.addDependency(apiStack);

	console.log('🛠  Event Stacks');

	// State Machine Monitor Stack
	const eventStack = new EventStack(feature, `${feature.getFullName('EventStack')}`, {
		description: 'Required. Contains EventBridge resources for State Machine events.',
		env: {
			account: deployAccount,
			region: deployRegion,
		},
		stageName,
	});
	feature.setStack('eventStack', eventStack);
	feature.iamStack.addDependency(eventStack);

	// Event Router Stack
	const eventRouterStack = new EventRouterStack(
		feature,
		`${feature.getFullName('EventRouterStack')}`,
		{
			description: 'Contains event routing and processing resources',
			env: {
				account: deployAccount,
				region: deployRegion,
			},
			stageName,
		},
	);
	feature.setStack('eventRouterStack', eventRouterStack);
}

feature.synth();
