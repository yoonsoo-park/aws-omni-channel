import { DynamoDB } from 'aws-sdk';

interface CheckCacheEvent {
	userId: string;
	email: string;
	groups: string[];
}

interface CacheResponse {
	cacheValid: boolean;
	userId: string;
	cachedData?: {
		productAccess: Array<{
			productId: string;
			hasAccess: boolean;
			grantedAt: number;
			lastVerified: number;
			accessPattern: string;
		}>;
		basicInfo: {
			email: string;
			firstName: string;
			lastName: string;
			organization: string;
		};
		sessionInfo: {
			startedAt: number;
			expiresAt: number;
			lastActivity: number;
		};
	};
	reason?: string;
}

// Cache validation configuration
const CACHE_CONFIG = {
	// Maximum age of the entire user context
	MAX_CONTEXT_AGE_MS: 8 * 60 * 60 * 1000, // 8 hours
	// Maximum age of product access verification
	MAX_PRODUCT_VERIFICATION_AGE_MS: 15 * 60 * 1000, // 15 minutes
	// Maximum inactivity period
	MAX_INACTIVITY_MS: 30 * 60 * 1000, // 30 minutes
	// Time before expiry to trigger refresh
	REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes
};

const dynamoDB = new DynamoDB.DocumentClient();

/**
 * Validates the cache entry based on multiple timestamp criteria
 */
function validateCache(cachedContext: any, now: number): { isValid: boolean; reason?: string } {
	// 1. Check if the context has expired
	if (!cachedContext.sessionInfo?.expiresAt || cachedContext.sessionInfo.expiresAt < now) {
		return { isValid: false, reason: 'Session expired' };
	}

	// 2. Check if the context is too old
	const contextAge = now - cachedContext.sessionInfo.startedAt;
	if (contextAge > CACHE_CONFIG.MAX_CONTEXT_AGE_MS) {
		return { isValid: false, reason: 'Context too old' };
	}

	// 3. Check if there's been too much inactivity
	const inactivityPeriod = now - cachedContext.sessionInfo.lastActivity;
	if (inactivityPeriod > CACHE_CONFIG.MAX_INACTIVITY_MS) {
		return { isValid: false, reason: 'Session inactive too long' };
	}

	// 4. Check if any product access verifications are too old
	if (cachedContext.productAccess) {
		const hasStaleProductAccess = cachedContext.productAccess.some(
			(access: any) =>
				now - access.lastVerified > CACHE_CONFIG.MAX_PRODUCT_VERIFICATION_AGE_MS,
		);
		if (hasStaleProductAccess) {
			return { isValid: false, reason: 'Product access verification expired' };
		}
	}

	// 5. Check if we're approaching expiry and should refresh
	const timeToExpiry = cachedContext.sessionInfo.expiresAt - now;
	if (timeToExpiry < CACHE_CONFIG.REFRESH_THRESHOLD_MS) {
		return { isValid: false, reason: 'Approaching expiry, refresh needed' };
	}

	return { isValid: true };
}

export const main = async (event: CheckCacheEvent): Promise<CacheResponse> => {
	try {
		const { userId } = event;
		const now = Date.now();

		const result = await dynamoDB
			.query({
				TableName: process.env.USER_CONTEXT_TABLE!,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: {
					':userId': userId,
				},
			})
			.promise();

		if (!result.Items || result.Items.length === 0) {
			return {
				cacheValid: false,
				userId,
				reason: 'No cache entry found',
			};
		}

		const cachedContext = result.Items[0];
		const { isValid, reason } = validateCache(cachedContext, now);

		if (!isValid) {
			return {
				cacheValid: false,
				userId,
				reason,
			};
		}

		// Cache is valid, return the data with updated lastActivity
		return {
			cacheValid: true,
			userId,
			cachedData: {
				productAccess: cachedContext.productAccess,
				basicInfo: cachedContext.basicInfo,
				sessionInfo: {
					startedAt: cachedContext.sessionInfo.startedAt,
					expiresAt: cachedContext.sessionInfo.expiresAt,
					lastActivity: now, // Update last activity time
				},
			},
		};
	} catch (error) {
		console.error('Cache check failed:', error);
		throw error; // Let Step Functions handle the error
	}
};
