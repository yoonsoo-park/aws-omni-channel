import { Aws, Duration, Fn, StackProps } from 'aws-cdk-lib';
import {
	CodeBuildAction,
	CodeBuildActionType,
	LambdaInvokeAction,
	ManualApprovalAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import {
	BuildEnvironmentVariableType,
	ComputeType,
	EventAction,
	FilterGroup,
	LinuxBuildImage,
} from 'aws-cdk-lib/aws-codebuild';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import * as ncinoCdk from '@ncino/aws-cdk';
import { Project, SourcePipeline } from '@ncino/devops-deploy-infrastructure';

export class DeployStack extends ncinoCdk.Stack {
	pipeline: SourcePipeline;
	project: Project;

	constructor(scope: ncinoCdk.App, props?: StackProps) {
		super(
			scope,
			ncinoCdk.Utility.createResourceName(
				'DeployStack',
				scope.getContext('suffix'),
				scope.getContext('appName'),
			),
			props,
		);
		const timestamp = String(Date.now());
		const repo = scope.getContext('repo');
		const environment = {
			buildImage: LinuxBuildImage.fromEcrRepository(
				Repository.fromRepositoryName(
					this,
					`${scope}-buildimage`,
					scope.getContext('ecrImage'),
				),
			),
			computeType: ComputeType.SMALL,
			privileged: true,
			Timestamp: timestamp,
		};
		this.project = new Project(this, {
			repo,
			buildSpecPath: 'deploy/dev-buildspec.yml',
			environment,
			isSourceBased: true,
			timeout: Duration.hours(2),
			webhookFilters: [
				FilterGroup.inEventOf(EventAction.PUSH)
					.andBranchIs('release')
					.andActorAccountIsNot('61517937')
					.andCommitMessageIsNot('.*(ci skip|Y@@N W4S H3R3).*'),
				FilterGroup.inEventOf(
					EventAction.PULL_REQUEST_UPDATED,
					EventAction.PULL_REQUEST_CREATED,
				).andBaseBranchIs('release'),
			],
		});
		const ecrRole = new PolicyStatement({
			actions: [
				'ecr:GetDownloadUrlForLayer',
				'ecr:BatchGetImage',
				'ecr:BatchCheckLayerAvailability',
				'ecr:GetAuthorizationToken',
			],
			effect: Effect.ALLOW,
			resources: [
				`arn:aws:ecr:us-east-1:726849041453:repository/${scope.getContext('ecrImage')}`,
			],
		});
		this.project.addToRolePolicy(ecrRole);
		this.pipeline = new SourcePipeline(this, {
			repo,
			hasDefaultStages: false,
			environment,
			branch: 'release',
		});
		this.pipeline.addToRolePolicy(ecrRole);
		const toolingQaCodebuildAction = new CodeBuildAction({
			actionName: 'ToolingQaAction',
			project: this.pipeline.project,
			input: this.pipeline.sourceArtifact,
			type: CodeBuildActionType.BUILD,
			environmentVariables: {
				TARGET_ENV: {
					value: 'tooling-qa',
					type: BuildEnvironmentVariableType.PLAINTEXT,
				},
				Timestamp: {
					value: timestamp,
					type: BuildEnvironmentVariableType.PLAINTEXT,
				},
			},
			runOrder: 1,
		});
		this.pipeline.addStage({
			stageName: 'ToolingQa',
			actions: [
				toolingQaCodebuildAction,
				new LambdaInvokeAction({
					actionName: 'ToolingQaBasePathSwitch',
					inputs: [this.pipeline.sourceArtifact],
					lambda: Function.fromFunctionArn(
						this,
						this.getFullName('ToolingQaLambdaSwitch'),
						`arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:switcher-${Fn.importValue(
							'ExportsForAccount-AccountName',
						)}`,
					),
					userParameters: {
						env: 'tooling-qa',
						domain: 'us-east-1.internal-qa.ncino.cloud',
						basePath: 'app-template-tooling-qa',
						deploymentStage: toolingQaCodebuildAction.variable('DEPLOYMENT_STAGE'),
					},
					runOrder: 2,
				}),
			],
		});
		this.pipeline.addStage({
			stageName: 'Approval',
			actions: [
				new ManualApprovalAction({
					actionName: 'ApprovalAction',
				}),
			],
		});
		const toolingProdCodebuildAction = new CodeBuildAction({
			actionName: 'ToolingProdAction',
			project: this.pipeline.project,
			input: this.pipeline.sourceArtifact,
			type: CodeBuildActionType.BUILD,
			environmentVariables: {
				TARGET_ENV: {
					value: 'tooling-prod',
					type: BuildEnvironmentVariableType.PLAINTEXT,
				},
				Timestamp: {
					value: timestamp,
					type: BuildEnvironmentVariableType.PLAINTEXT,
				},
			},
			runOrder: 1,
		});
		this.pipeline.addStage({
			stageName: 'ToolingProd',
			actions: [
				toolingProdCodebuildAction,
				new ManualApprovalAction({
					actionName: `ToolingProdBasePathSwitchApproval`,
					runOrder: 2,
				}),
				new LambdaInvokeAction({
					actionName: 'ToolingProdBasePathSwitch',
					inputs: [this.pipeline.sourceArtifact],
					lambda: Function.fromFunctionArn(
						this,
						this.getFullName('ToolingProdLambdaSwitch'),
						`arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:switcher-${Fn.importValue(
							'ExportsForAccount-AccountName',
						)}`,
					),
					userParameters: {
						env: 'tooling-prod',
						domain: 'us-east-1.internal-prod.ncino.cloud',
						basePath: 'app-template-tooling-prod',
						deploymentStage: toolingProdCodebuildAction.variable('DEPLOYMENT_STAGE'),
					},
					runOrder: 3,
				}),
			],
		});
	}
}
