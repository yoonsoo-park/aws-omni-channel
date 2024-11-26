import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import AmplifyConfigProvider from '@/components/AmplifyConfigProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
	title: 'OmniChannel Platform',
	description: 'Unified entry point for lending products',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<AmplifyConfigProvider>
					<AuthProvider>{children}</AuthProvider>
				</AmplifyConfigProvider>
			</body>
		</html>
	);
}
