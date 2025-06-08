# netlify/functions/pdf_to_text.py
import json
import base64
import os
from io import BytesIO
import fitz  # PyMuPDF
import textwrap # For basic text formatting

def handler(event, context):
    try:
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No request body provided'})
            }

        body = event.get('body')
        is_base64_encoded = event.get('isBase64Encoded', False)

        if is_base64_encoded:
            body = base64.b64decode(body).decode('utf-8')
        
        request_data = json.loads(body)
        pdf_file_base64 = request_data.get('pdfFileBase64')
        original_filename = request_data.get('fileName', 'document.pdf')

        if not pdf_file_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No PDF file data provided'})
            }

        pdf_bytes = base64.b64decode(pdf_file_base64)
        pdf_stream = BytesIO(pdf_bytes)

        text_content = []
        
        # Use PyMuPDF (fitz) to extract text
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            # extract_text() method in PyMuPDF is quite powerful
            # It tries to preserve layout and adds newline characters
            page_text = page.get_text("text") 
            text_content.append(page_text)
            
        doc.close()

        # Join all page texts. Add a clear separator for pages.
        full_text = "\n\n--- Page Break ---\n\n".join(text_content)

        # Determine filename for download
        name, ext = os.path.splitext(original_filename)
        text_filename = f"{name}_converted.txt"

        # Encode the text to base64
        text_base64 = base64.b64encode(full_text.encode('utf-8')).decode('utf-8')

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', # Required for CORS
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': json.dumps({
                'fileContentBase64': text_base64,
                'fileName': text_filename,
                'mimeType': 'text/plain'
            })
        }

    except Exception as e:
        print(f"Error in PDF to Text function: {e}") # Log to Netlify logs
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to convert PDF to text: {str(e)}'})
        }
