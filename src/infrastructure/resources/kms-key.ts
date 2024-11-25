import { Effect, ArnPrincipal, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnKey } from 'aws-cdk-lib/aws-kms';
import { Stack } from '@ncino/aws-cdk';
import { Aws } from 'aws-cdk-lib';

export class AppTempKey extends CfnKey {
	constructor(stack: Stack) {
		super(stack, stack.getFullName('KmsKey'), {
			enabled: true,
			keyPolicy: new PolicyDocument({
				statements: [
					new PolicyStatement({
						principals: [
							new ArnPrincipal(
								`arn:aws:iam::${Aws.ACCOUNT_ID}:role/OneLogin-AdministratorAccess`,
							),
							new ArnPrincipal(
								`arn:aws:iam::${Aws.ACCOUNT_ID}:role/cdk-hnb659fds-cfn-exec-role-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
							),
						],
						effect: Effect.ALLOW,
						actions: [
							'kms:Describe*',
							'kms:Put*',
							'kms:Create*',
							'kms:Update*',
							'kms:Enable*',
							'kms:Revoke*',
							'kms:List*',
							'kms:Disable*',
							'kms:Get*',
							'kms:Delete*',
							'kms:ScheduleKeyDeletion',
							'kms:CancelKeyDeletion',
							'kms:Encrypt',
							'kms:Decrypt',
							'kms:TagResource',
							'kms:UntagResource',
						],
						resources: ['*'],
					}),
				],
			}),
		});
	}
}
