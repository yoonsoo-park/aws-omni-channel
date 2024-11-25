import boto3
import os
import json
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    sfn_client = boto3.client('stepfunctions')
    state_machine_arn = os.getenv("METAMAN_STATE_MACHINE_ARN")

    if not state_machine_arn:
        logger.error("Environment variable 'METAMAN_STATE_MACHINE_ARN' not set.")
        return {"error": "Configuration error, Metaman State Machine ARN not found."}

    payload = json.dumps(event)  # Preparing the payload for the state machine
    print(f"Payload goes into the state machine: {payload}")

    try:
        # Start the execution of the state machine
        response = sfn_client.start_execution(
            stateMachineArn=state_machine_arn,
            input=payload
        )

        # Log response metadata from the start_execution call
        logger.info("State Machine started successfully.")
        logger.info(f"Response: {response}")

        return {
            "executionArn": response["executionArn"],
            "startDate": str(response["startDate"])
        }

    except Exception as e:
        logger.error(f"An error occurred during state machine execution: {str(e)}")
        return {"error": str(e)}
