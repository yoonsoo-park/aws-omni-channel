import { Amplify } from 'aws-amplify';

export function configureAmplify() {
	// console.log('Configuring Amplify with:', {
	// 	region: process.env.NEXT_PUBLIC_AWS_REGION,
	// 	userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
	// 	userPoolWebClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
	// 	domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
	// });

	Amplify.configure({
		Auth: {
			mandatorySignIn: true,
			region: process.env.NEXT_PUBLIC_AWS_REGION,
			userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
			userPoolWebClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
			oauth: {
				domain: `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}.auth.${process.env.NEXT_PUBLIC_AWS_REGION}.amazoncognito.com`,
				scope: ['email', 'openid', 'profile'],
				redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN,
				redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT,
				responseType: 'code',
				provider: process.env.NEXT_PUBLIC_COGNITO_SSO_PROVIDER,
			},
			cookieStorage: {
				domain: process.env.NEXT_PUBLIC_COOKIE_STORAGE_DOMAIN,
				path: '/',
				expires: 365,
				secure: process.env.NODE_ENV === 'production',
			},
		},
	});
}
