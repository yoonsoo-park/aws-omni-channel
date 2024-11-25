import base64
import boto3
import json
import os
import datetime
from datetime import timezone
from simple_salesforce import Salesforce

class SalesforceCommunicator:
    def __init__(self):
        self.instance_url = ""
        self.sf_connection = self._get_salesforce_connection()

    def _get_salesforce_connection(self):
        sf_connection = None
        is_sandbox = "test" if os.environ.get("PLM_IS_SANDBOX", "False").lower() == "true" else "login"
        org_info_str = os.environ.get("PLM_CREDS")
        org_info = json.loads(json.loads(org_info_str))
        print(f"Is sandbox: {is_sandbox}")
        print(f"Org info: {org_info}")
        if is_sandbox == "test":
            print("Using TEST plm creds.")
            self.instance_url = org_info.get("instance_url").replace('"', "")
            sf_api_version = os.environ.get("SF_API_VERSION")
            session_id = org_info.get("access_token").replace('"', "")
            print(f"Instance URL: {self.instance_url}")
            print(f"Session ID: {session_id}")
            print(f"API Version: {sf_api_version}")
            instance = self.instance_url[8:]
            sf_connection = Salesforce(instance=instance, session_id=session_id, version=sf_api_version)
        else:
            print("Using PROD plm creds.")
            sf_connection = Salesforce(
                domain=is_sandbox,
                username=org_info.get("plm_username"),
                password=org_info.get("plm_password"),
                security_token=org_info.get("plm_token"),
            )
        return sf_connection

    def update_metadata_diff_record(self, s3_bucket, s3_key, metadata_id):
        s3_client = boto3.client('s3')
        try:
            # Download the file from S3
            response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
            file_content = response['Body'].read()
            
            # Extract the file name from the S3 key
            file_name = s3_key.split('/')[-1]

            # Prepare the attachment record
            attachment_record = {
                "ParentId": metadata_id,
                "Name": file_name,
                "body": base64.b64encode(file_content).decode('utf-8'),
            }

            # Create the attachment in Salesforce
            print(f"Sending {file_name} to Metadata Differential record with id: {metadata_id}.")
            response = self.sf_connection.Attachment.create(attachment_record)
            print(f"{file_name} attachment created: {response}")

            # Update the record with the attachment link
            response = self.update_diff_file_link(metadata_id)
            print(f"Metadata Differential record updated with attachment link: {response}")

            return response
        except Exception as e:
            print(f"Unable to update {metadata_id} Metadata diff record with attachment.")
            raise e

    def update_record_status(self, metadata_id, status):
        print(f"Updating {metadata_id} status to {status}.")
        try:
            response = self.sf_connection.PackageManager__Metadata_Differential__c.update(
                metadata_id, {"PackageManager__Metadata_Status__c": status}
            )
            print(f"{metadata_id} PackageManager__Metadata_Status__c field updated: {response}")
            return response  # Return the response for checking in the lambda_handler
        except Exception as e:
            print(f"Error updating status on record: {metadata_id}. Error: {str(e)}")
            raise e

    def update_diff_file_link(self, metadata_id):
        try:
            url = f"{self.instance_url}/lightning/r/PackageManager__Metadata_Differential__c/{metadata_id}/related/CombinedAttachments/view"
            response = self.sf_connection.PackageManager__Metadata_Differential__c.update(
                metadata_id, {"PackageManager__Diff_File_Link__c": url}
            )
            print(f"{metadata_id} PackageManager__Diff_File_Link__c field updated: {response}")
            return response
        except Exception as e:
            print(f"Error creating url link on record: {metadata_id}")
            raise e
        
    def create_file_name(self, old_release, new_release, type):
        formatted_time = datetime.datetime.now(timezone.utc).strftime("%H:%M%Z")
        old_input_file_name = old_release.replace(" ", "") if type != "permission-list" else ""
        new_input_file_name = new_release.replace(" ", "")
        return (
            f"{new_input_file_name}-{type}-{formatted_time}.xlsx"
            if type == "permission-list"
            else f"{old_input_file_name}-{new_input_file_name}-{type}-{formatted_time}.xlsx"
        )

def lambda_handler(event, context):
    try:
        communicator = SalesforceCommunicator()
        print(f"Event coming in: {event}")
        status = event.get('status')
        metadata_diff_id = event.get('metadata_diff_id')

        print(f"Updating record with id: {metadata_diff_id} with status: {status}")

        if status == 'IN-PROGRESS':
            update_result = communicator.update_record_status(metadata_diff_id, status)
            if not update_result:
                raise Exception('Failed to update Salesforce record status.')
            return {'message': 'Salesforce record updated successfully: IN-PROGRESS.'}
        
        elif status == 'COMPLETED':
            s3_bucket = event.get('s3_bucket')
            s3_key = event.get('s3_key')

            print(f"Updating record with id: {metadata_diff_id} with status: {status} and s3_bucket: {s3_bucket} and s3_key: {s3_key}")
            if not s3_bucket or not s3_key:
                raise ValueError('Missing S3 bucket or key information.')

            update_result = communicator.update_metadata_diff_record(s3_bucket, s3_key, metadata_diff_id)
            if not update_result:
                raise Exception("Failed to update metadata diff record with attachment.")

            # Update the record status
            status_update_result = communicator.update_record_status(metadata_diff_id, status)
            if not status_update_result:
                raise Exception("Failed to update Salesforce record status.")

            return {'message': 'Salesforce record updated successfully with attachment: COMPLETED.'}
        
        else:
            update_result = communicator.update_record_status(metadata_diff_id, 'FAILED')
            if not update_result:
                raise Exception('Failed to update Salesforce record status.')
            return {'message': 'Salesforce record updated successfully: FAILED.'}

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        raise  # Re-raise the exception to be handled by Step Functions