import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
	UserPool,
	UserPoolClient,
	OAuthScope,
	UserPoolDomain,
	AccountRecovery,
	UserPoolClientIdentityProvider,
	UserPoolEmail,
	UserPoolIdentityProviderSaml,
	UserPoolIdentityProviderSamlMetadataType,
} from 'aws-cdk-lib/aws-cognito';
import { Stack } from '@ncino/aws-cdk';

export interface CognitoAuthProps {
	domainPrefix: string;
	ssoProviderMetadata?: string;
	ssoProviderName?: string;
}

export class CognitoAuth {
	public readonly userPool: UserPool;
	public readonly userPoolClient: UserPoolClient;
	public readonly userPoolDomain: UserPoolDomain;

	constructor(stack: Stack, id: string, props: CognitoAuthProps) {
		// Create the user pool
		this.userPool = new UserPool(stack, `${id}-UserPool`, {
			userPoolName: `${stack.getFullName('UserPool')}`,
			selfSignUpEnabled: false, // Disable self-signup as per enterprise requirements
			signInAliases: {
				email: true,
				username: true,
			},
			standardAttributes: {
				email: {
					required: true,
					mutable: true,
				},
			},
			passwordPolicy: {
				minLength: 12,
				requireLowercase: true,
				requireUppercase: true,
				requireDigits: true,
				requireSymbols: true,
				tempPasswordValidity: Duration.days(3),
			},
			mfaSecondFactor: {
				sms: true,
				otp: true,
			},
			accountRecovery: AccountRecovery.EMAIL_ONLY,
			email: UserPoolEmail.withCognito(),
			removalPolicy: RemovalPolicy.RETAIN,
		});

		// Create domain for hosted UI
		this.userPoolDomain = new UserPoolDomain(stack, `${id}-UserPoolDomain`, {
			userPool: this.userPool,
			cognitoDomain: {
				domainPrefix: props.domainPrefix,
			},
		});

		// Configure SSO if provider details are supplied
		if (props.ssoProviderMetadata && props.ssoProviderName) {
			const identityProvider = new UserPoolIdentityProviderSaml(stack, `${id}-SamlProvider`, {
				userPool: this.userPool,
				metadata: {
					metadataContent: props.ssoProviderMetadata,
					metadataType: UserPoolIdentityProviderSamlMetadataType.URL,
				},
				attributeMapping: {
					email: {
						attributeName:
							'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
					},
					givenName: {
						attributeName:
							'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
					},
					familyName: {
						attributeName:
							'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
					},
				},
			});

			// Create app client with SSO integration
			this.userPoolClient = new UserPoolClient(stack, `${id}-UserPoolClient`, {
				userPool: this.userPool,
				oAuth: {
					flows: {
						authorizationCodeGrant: true,
					},
					scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
					callbackUrls: [
						`https://${stack.getContext('appDomain')}/auth/callback`,
						'http://localhost:3000/auth/callback',
					],
					logoutUrls: [
						`https://${stack.getContext('appDomain')}/signout`,
						'http://localhost:3000/signout',
					],
				},
				supportedIdentityProviders: [
					UserPoolClientIdentityProvider.custom(props.ssoProviderName),
					UserPoolClientIdentityProvider.COGNITO,
				],
			});
		} else {
			// Create basic app client without SSO
			this.userPoolClient = new UserPoolClient(stack, `${id}-UserPoolClient`, {
				userPool: this.userPool,
				oAuth: {
					flows: {
						authorizationCodeGrant: true,
					},
					scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
					callbackUrls: [
						`https://${stack.getContext('appDomain')}/auth/callback`,
						'http://localhost:3000/auth/callback',
					],
				},
			});
		}
	}
}
