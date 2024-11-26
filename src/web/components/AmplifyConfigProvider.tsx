'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AmplifyConfigContext = createContext<boolean>(false);

export const useAmplifyConfigured = () => useContext(AmplifyConfigContext);

const AmplifyConfig = dynamic(
	() =>
		import('@/config/amplify').then((mod) => {
			mod.configureAmplify();
			return () => null;
		}),
	{ ssr: false },
);

export default function AmplifyConfigProvider({ children }: { children: React.ReactNode }) {
	const [isConfigured, setIsConfigured] = useState(false);

	useEffect(() => {
		const configure = async () => {
			await import('@/config/amplify').then((mod) => {
				mod.configureAmplify();
				setIsConfigured(true);
			});
		};
		configure();
	}, []);

	return (
		<AmplifyConfigContext.Provider value={isConfigured}>
			{children}
		</AmplifyConfigContext.Provider>
	);
}
