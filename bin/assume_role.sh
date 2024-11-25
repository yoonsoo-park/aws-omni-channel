#!/usr/bin/env bash

######################################
# Pass the role arn in as a parameter.
# Example:
#   bin/assume_role.sh cloud
######################################

assumeRole() {
    TARGET_ENV_DEPLOY_ROLE=$(aws sts assume-role \
        --role-arn $1 \
        --role-session-name "OmniChannel" \
        --output json)
    export AWS_ACCESS_KEY_ID=$(echo "$TARGET_ENV_DEPLOY_ROLE" | jq -r ".Credentials.AccessKeyId")
    export AWS_SECRET_ACCESS_KEY=$(echo "$TARGET_ENV_DEPLOY_ROLE" | jq -r ".Credentials.SecretAccessKey")
    export AWS_SESSION_TOKEN=$(echo "$TARGET_ENV_DEPLOY_ROLE" | jq -r ".Credentials.SessionToken")
}

assumeRole $1