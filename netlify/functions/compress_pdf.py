# netlify/functions/compress_pdf.py
import json
import base64
import os
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter # Using PyPDF2 for serverless compatibility

# This is the entry point for Netlify Functions
def handler(event, context):
    """
    Handles PDF compression requests via Netlify Function.
    Expects a base64 encoded PDF file and compressionLevel in the request body.
    Compresses the PDF using PyPDF2 and returns the compressed file as base64.
    """
    try:
        # Check if the request body is present
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': 'No request body provided'})
            }

        body = event.get('body')
        is_base64_encoded = event.get('isBase64Encoded', False)

        if is_base64_encoded:
            body = base64.b64decode(body).decode('utf-8')
        
        request_data = json.loads(body) # Assuming client sends JSON payload
        pdf_file_base64 = request_data.get('pdfFileBase64')
        compression_level = request_data.get('compressionLevel', 'recommended')
        original_filename = request_data.get('fileName', 'document.pdf')


        if not pdf_file_base64:
            return {
                'statusCode': 400,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': 'No PDF file data provided in the request'})
            }

        pdf_bytes = base64.b64decode(pdf_file_base64)
        original_pdf_stream = BytesIO(pdf_bytes)

        reader = PdfReader(original_pdf_stream)
        writer = PdfWriter()

        # Iterate over pages and add them to the writer
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            writer.add_page(page)

        # The 'compress_streams=True' argument here is important for PyPDF2 compression.
        # This will Flate-encode all streams that are not already compressed.
        compressed_pdf_stream = BytesIO()
        writer.write(compressed_pdf_stream, compress_streams=True)
        compressed_pdf_stream.seek(0) # Rewind to the beginning

        # Prepare response
        compressed_pdf_base64 = base64.b64encode(compressed_pdf_stream.getvalue()).decode('utf-8')

        # Determine a suitable filename for download
        name, ext = os.path.splitext(original_filename)
        compressed_filename = f"{name}_compressed{ext}"

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json', # Send JSON response
                'Access-Control-Allow-Origin': '*', # Necessary for CORS
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({ # Embed base64 and filename in a JSON object
                'body': compressed_pdf_base64,
                'isBase64Encoded': True,
                'fileName': compressed_filename,
                'originalSize': len(pdf_bytes),
                'compressedSize': len(compressed_pdf_stream.getvalue())
            })
        }

    except Exception as e:
        print(f"Error in Netlify function: {e}") # Log to Netlify logs
        return {
            'statusCode': 500,
            'headers': { 'Content-Type': 'application/json' },
            'body': json.dumps({'error': f'Failed to compress PDF: {str(e)}'})
        }

