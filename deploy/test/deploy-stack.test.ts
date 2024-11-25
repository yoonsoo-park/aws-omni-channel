import { DeployStack } from '../deploy-stack';
import cxapi = require('aws-cdk-lib/cx-api');
import { App } from '@ncino/aws-cdk';
import { MockContext } from './test-data';

describe('StackTest', () => {
	beforeAll(() => {
		process.env[cxapi.CONTEXT_ENV] = JSON.stringify(MockContext);
		process.env.ROLE_ARN = 'roleArn';
	});

	test('All resources were created as expected', () => {
		const app: App = new App();
		const stack: DeployStack = new DeployStack(app);
		expect(stack.pipeline).toBeDefined();
		expect(stack.project).toBeDefined();
	});
});
