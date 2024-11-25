# Prerequisites

1. Install aws cli. Follow instructions on [AWS Documentation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. Install aws-cdk. Run `npm i -g aws-cdk`. More information on [aws-cdk](https://www.npmjs.com/package/aws-cdk?activeTab=readme)
3. Make sure GITHUB_TOKEN environment variable is set. If it’s not, try using `export GITHUB_TOKEN = <you_token_here>`
4. Install a node manager, this is not required but recommended `npm install -g n`

# Initial project checkout setup

1. From the CLI, on app-template project `npm install`
    - Note: App-template project has a `nvmrc` file that dictates the node version to be used. If `npm install` command fails, update node using the node manager `n $(cat .nvmrc)` run the install again

### AWS Authentication

Go to your AWS Single Sign-on page and click the account you want.

![Screenshot 2023-02-22 at 10 15 34 AM](https://user-images.githubusercontent.com/53836265/220665943-1bcd6996-6c7e-474a-b5c9-f4146493bd6c.png)

Click on `Command line or programmatic access` and then copy the credentials under `Set AWS environment variables`

![Screenshot 2023-02-22 at 10 16 57 AM](https://user-images.githubusercontent.com/53836265/220666396-c1031061-9c8a-42fc-b116-92613e7c261f.png)

Paste those exports to your `ncino-app-template` project terminal.

```bash
export AWS_SESSION_TOKEN=SESSION TOKEN FROM AWS SINGLE SIGN-ON
export AWS_SECRET_ACCESS_KEY=SECRET ACCESS KEY FROM AWS SINGLE SIGN-ON
export AWS_ACCESS_KEY_ID=AWS ACCESS KEY FROM AWS SINGLE SIGN-ON
```

<details><summary>Confirm AWS Connection</summary>
<p>

#### Confirm AWS Connection

Once you have this setup you should be able to enter this command to test your AWS setup and connectivity.

```bash
aws sts get-caller-identity
```

If you have your credentials properly setup, you should see something like this:

```bash
$ aws sts get-caller-identity
{
    "UserId": "SOME_USER_HERE",
    "Account": "XXXXXXXXXX",
    "Arn": "arn:aws:iam::XXXXXXXXXXXX:user/your_name_here"
}
```

If this does not work, you will need to revisit the AWS authentication. Make sure your AWS environment variables are set and accessible to your terminal.
Also make sure your credentials have not expired. This happens quite frequently. If its expired refresh the AWS App page and get the new credentials

</p>
</details>


### App Deployment

Below steps are applied to the App-Template project terminal

1. Ensure the initial project setup and authentication to your AWS account are complete as directed in [AWS Authentication](#aws-authentication) step above

2. Ensure the modules are installed and python virtual environment is created, as directed in the [Initial project checkout setup](#initial-project-checkout-setup)

3. Build the app- project

    ```bash
    npm run build
    ```

4. To deploy App-Template stacks:

    ```bash
    npm run aws:deploy
    ```

5. To destroy App-Template stacks once you are done:

    ```bash
    npm run aws:destroy
    ```

### Testing

### Troubleshooting

-   If the AWS Deploy fails, refresh the AWS Sign on page and re authorize into AWS account. The AWS_SESSION_TOKEN expires every hour.

