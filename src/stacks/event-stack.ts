import { Feature, StageableStack, StageableStackProps, TargetAccount } from '@ncino/aws-cdk';
import { EventResources as V1Event } from '../infrastructure/event-resources';

export class EventStack extends StageableStack {
	constructor(
		feature: Feature,
		id: string,
		props: StageableStackProps,
		_environment: { [key: string]: string },
	) {
		super(feature, id, props);

		const targetAccount = TargetAccount.getInstance();

		new V1Event(feature, targetAccount);
	}
}
