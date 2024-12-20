import { APIGatewayProxyEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export const main = async (event: APIGatewayProxyEvent) => {
	try {
		const { token } = JSON.parse(event.body || '{}');

		// Verify the JWT token
		const verifier = CognitoJwtVerifier.create({
			userPoolId: process.env.USER_POOL_ID!,
			tokenUse: 'access',
			clientId: process.env.CLIENT_ID!,
		});

		const payload = await verifier.verify(token);

		return {
			statusCode: 200,
			body: JSON.stringify({
				userId: payload.sub,
				email: payload.email,
				groups: payload['cognito:groups'],
			}),
		};
	} catch (error) {
		console.error('Token validation failed:', error);
		return {
			statusCode: 401,
			body: JSON.stringify({ message: 'Invalid token' }),
		};
	}
};
