# CloudNewman
Turn your Postman collection into an API! Supports private data. Simple to use-just output your response in Tests using console.log. Counts toward 2-3 Postman API usage calls; 1000/month for free.

## Usage
### Loading the project github page
GET or POST requests to https://www.cloudnewman.me should redirect to the github page for the project.

### Using the CloudNewman API
POST https://www.cloudnewman.me/v1
In the body specify a JSON object with your collectionuid, environmentuid and environmentoverlayuid.  
If you don't have an environmentoverlayuid then do not specify anything.
The post body should look something like...
{
    "collectionuid": "20412913-d7ec94c1-c66d-44ba-8b1c-82e132ff824a",,
    "environmentuid": "23458777-f3119f69-08c1-422f-a1ed-e8f0a5e410d2"
}
or
{
    "collectionuid": "20412913-d7ec94c1-c66d-44ba-8b1c-82e132ff824a",
    "environmentuid": "20412913-a04ca8b6-80bb-43bd-937d-70302ac4ee1e",
    "environmentoverlayuid": "23458777-f3119f69-08c1-422f-a1ed-e8f0a5e410d2"
}
In the headers add "X-API-Key" with your POSTMAN API key.
You can add a queryparameter of contenttype=<type> to force the response type. Something like..
POST https://www.cloudnewman.me/v1?contenttype=text/plain

The collection specified by collectionuid will run in the environment you specified.
The last script's console.log message will be returned with an HTTP status code of 200 OK.
If an error occurs, then a status code of 404 with the body containing details of the error.

To debug, in your environment create a variable called "return_logs" with any value.


For additional documentation, please visit the [Cloud Newman Me](https://www.postman.com/coolcats123/workspace/cloud-newman-me/overview) project on Postman.
