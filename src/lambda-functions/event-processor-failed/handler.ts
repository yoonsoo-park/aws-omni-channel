import { Context } from 'aws-lambda';
import { ALambdaHandler } from '@ncino/aws-sdk';

export class Handler extends ALambdaHandler {
	public async main(event: any, context: Context): Promise<any> {
		try {
			console.log('State Machine Failed Event:', event);
			return event;
		} catch (error) {
			throw error;
		}
	}
}

export const handler = new Handler();
export const main = handler.execute.bind(handler);
