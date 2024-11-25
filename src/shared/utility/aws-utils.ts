import { STS } from 'aws-sdk';
import { Stack } from '@ncino/aws-cdk';
import { Credentials } from 'aws-sdk/clients/sts';
import { Aws } from 'aws-cdk-lib';

/**
 * Assumes a role in an AWS account via a given account ID and role name.
 * @param accountId The AWS account ID to assume the role in.
 * @param roleName The name of the role to assume.
 * @param roleSessionName Optional name for the role session.
 * @returns AWS Credentials for the assumed role.
 */
export async function assumeRole(
	accountId: string | number,
	roleName: string,
	roleSessionName = 'SP-AssumeRoleSession',
): Promise<Credentials> {
	return await new STS()
		.assumeRole({
			RoleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
			RoleSessionName: roleSessionName,
		})
		.promise()
		.then((result) => {
			if (result.Credentials) return result.Credentials;
			if (result instanceof Error) return Promise.reject(result);
			return Promise.reject(new Error('No credentials returned from assumeRole.'));
		});
}

/**
 * Builds an ARN for a resource in an AWS account.
 */
export function buildResourceARN(params: {
	stack: Stack;
	/** The AWS service (e.g. 'dynamodb') for the ARN. */
	serviceName: string;
	/** Optional prefix (e.g. 'table/') to the resource name. */
	resourcePrefix?: string;
	/** The name of the resource that goes between the default prefix ('V1-Provision-) and default suffix (e.g. 'prod-tooling-blue') */
	resourceName: string;
	/** Optional suffix (e.g. '/index/some-index') to the resource name. */
	resourceSuffix?: string;
	/** Whether or not the stage ('-blue' or '-green') name should be included in the ARN. Default is true. */
	hasStageName?: boolean;
}): string {
	const hasStageName = params.hasStageName ?? true;
	let resourceName = params.stack.getFullName(params.resourceName);

	if (!hasStageName) {
		resourceName = resourceName.replace(/-blue|-green$/, '');
	}

	return `arn:aws:${params.serviceName}:${Aws.REGION}:${Aws.ACCOUNT_ID}:${params.resourcePrefix ?? ''}${resourceName}${params.resourceSuffix ?? ''}`;
}
