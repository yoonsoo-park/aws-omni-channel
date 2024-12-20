import { DynamoDB } from 'aws-sdk';
import { AppSyncClient } from './appsync-client';

interface FetchProductAccessEvent {
	userId: string;
	email: string;
	groups: string[];
	cached?: boolean;
	reason?: string;
}

interface ProductAccess {
	productId: string;
	hasAccess: boolean;
	accessLevel: string;
	grantedAt: number;
}

const dynamoDB = new DynamoDB.DocumentClient();
const appSync = new AppSyncClient(process.env.DBS_API_URL!, process.env.DBS_API_ID!);

export const main = async (event: FetchProductAccessEvent) => {
	try {
		const { userId, groups } = event;

		// Query product access through AppSync
		const productAccess = await appSync.queryProductAccess(userId, groups);

		// Calculate expiration (8 hours from now)
		const now = Date.now();
		const expiresAt = now + 8 * 60 * 60 * 1000;

		// Format the response for the next state
		const response = {
			userId,
			productAccess,
			fetchedAt: now,
			expiresAt,
			ttl: Math.floor(expiresAt / 1000), // DynamoDB TTL expects seconds
		};

		return response;
	} catch (error) {
		console.error('Failed to fetch product access:', error);
		throw error; // Let Step Functions handle the error
	}
};
