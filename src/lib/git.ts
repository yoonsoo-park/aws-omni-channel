import { constants } from './utility/constants';
import { execSync } from 'child_process';
import { join } from 'node:path';

export interface GitParams {
	token: string;
	userEmail?: string;
	userName?: string;
}

export class Git {
	public static constants = {
		EMAIL: 'ci-ncino@ncino.com',
		NAME: 'ci-ncino',
	};

	constructor(params: GitParams) {
		execSync('rm -rf /tmp/*', { encoding: 'utf8', stdio: 'inherit' });
		execSync(`git config --global user.email ${params.userEmail ?? Git.constants.EMAIL}`, {
			encoding: 'utf8',
			stdio: 'inherit',
		});
		execSync(`git config --global user.name ${params.userName ?? Git.constants.NAME}`, {
			encoding: 'utf8',
			stdio: 'inherit',
		});
		execSync(`git config --global user.password ${params.token}`, {
			encoding: 'utf8',
			stdio: 'inherit',
		});
		execSync(
			`git config --global --add url.https://${params.token}@github.com/.insteadOf https://github.com`,
			{
				encoding: 'utf8',
			},
		);
		execSync(
			`git config --global --add url.https://${params.token}@github.com/.insteadOf ssh://git@github.com`,
			{
				encoding: 'utf8',
			},
		);
		execSync(
			`git config --global --add url.https://${params.token}@github.com/.insteadOf git@github.com:`,
			{
				encoding: 'utf8',
			},
		);
		execSync(
			`git config --global --add url.https://${params.token}@github.com/.insteadOf git://github.com`,
			{
				encoding: 'utf8',
			},
		);
	}

	public async clone(repo: string, tag: string): Promise<string> {
		repo = repo.startsWith('/') ? repo.slice(1) : repo;
		repo = repo.startsWith('ncino/') ? repo : `ncino/${repo}`;

		execSync(
			`cd ${constants.SP_WORKING_DIR} && git clone --branch ${tag} --depth 1 https://github.com/${repo}`,
		);
		console.debug(
			execSync(`ls ${constants.SP_WORKING_DIR}/${repo.replace('ncino/', '')}`, {
				encoding: 'utf8',
			}).split('\n'),
		);

		return join(constants.SP_WORKING_DIR, repo.replace('ncino/', ''));
	}
}
