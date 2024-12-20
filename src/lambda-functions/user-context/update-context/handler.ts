import { DynamoDB } from 'aws-sdk';
import { AppSyncClient } from '../fetch-product-access/appsync-client';

interface UpdateContextEvent {
	userId: string;
	productAccess: {
		productId: string;
		hasAccess: boolean;
		accessLevel: string;
		grantedAt: number;
	}[];
	fetchedAt: number;
	expiresAt: number;
	ttl: number;
}

const dynamoDB = new DynamoDB.DocumentClient();
const appSync = new AppSyncClient(process.env.DBS_API_URL!, process.env.DBS_API_ID!);

export const main = async (event: UpdateContextEvent) => {
	try {
		const { userId, productAccess, expiresAt, ttl } = event;

		// Store in DynamoDB
		await dynamoDB
			.put({
				TableName: process.env.USER_CONTEXT_TABLE!,
				Item: {
					userId,
					contextType: 'product-access', // Sort key
					productAccess,
					expiresAt,
					ttl,
					updatedAt: Date.now(),
				},
			})
			.promise();

		// Notify through AppSync about context update
		await appSync.notifyContextUpdate(userId, {
			type: 'CONTEXT_UPDATED',
			productAccess: productAccess.map((p) => ({
				productId: p.productId,
				hasAccess: p.hasAccess,
			})),
		});

		// Return the updated context for the next state
		return {
			userId,
			contextUpdated: true,
			productAccess,
			expiresAt,
		};
	} catch (error) {
		console.error('Failed to update context:', error);
		throw error; // Let Step Functions handle the error
	}
};
