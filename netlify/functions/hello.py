# netlify/functions/hello.py
import json

def handler(event, context):
    """
    A simple "Hello World" Netlify Function to test deployment.
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', # Essential for testing from your HTML
        },
        'body': json.dumps({'message': 'Hello from Netlify Functions!'})
    }
