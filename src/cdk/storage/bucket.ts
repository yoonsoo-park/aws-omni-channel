import { Bucket, Stack } from '@ncino/aws-cdk';
import { LifecycleRule } from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib/core';

export class AppTempBucket extends Bucket {
	constructor(stack: Stack, name: string) {
		const lifecycleRule: LifecycleRule = {
			enabled: true,
			expiration: Duration.days(30),
		};

		super(stack, name, {
			lifecycleRules: [lifecycleRule],
		});
	}
}
