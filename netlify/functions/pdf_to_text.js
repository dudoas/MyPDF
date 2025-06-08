// netlify/functions/pdf_to_text.js
const pdf = require('pdf-parse'); // For parsing PDF and extracting text from searchable PDFs
// If you were to implement OCR with an external service, you might need a library for HTTP requests:
// const axios = require('axios'); // Example: for making HTTP requests to Google Cloud Vision API

exports.handler = async function(event, context) {
    // Handle CORS preflight request (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No content needed for preflight success
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method Not Allowed. Only POST requests are accepted.' })
        };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'No request body provided.' })
            };
        }

        const requestData = JSON.parse(event.body);
        const pdfFileBase64 = requestData.pdfFileBase64;
        const originalFilename = requestData.fileName || 'document.pdf';

        if (!pdfFileBase64) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'No PDF file data provided.' })
            };
        }

        // Convert base64 PDF data back to a Buffer
        const pdfBytes = Buffer.from(pdfFileBase64, 'base64');

        // --- SECTION 1: Extracting Text from Searchable PDFs (Existing Functionality) ---
        // This part uses pdf-parse to get text that is already embedded in the PDF document.
        const data = await pdf(pdfBytes); // Options can be passed here if needed, e.g., { pagerender: render_page }
        let extractedText = data.text; // Text extracted from searchable layers

        // --- SECTION 2: Conceptual OCR for Text in Images ---
        // This section outlines how OCR would typically be integrated.
        // **IMPORTANT:** A full OCR implementation is NOT included here due to its complexity,
        // dependency challenges in serverless environments, and the need for external API keys and billing.
        //
        // If your PDF contains images of text (e.g., scanned documents), 'pdf-parse' will NOT extract that text.
        // To get text from images, you need an Optical Character Recognition (OCR) service.

        /*
        // Conceptual steps for OCR:
        // 1. **Load PDF with a library capable of image extraction/rendering (e.g., pdf-lib, or pdf.js-node for rendering)**
        //    const { PDFDocument } = require('pdf-lib'); // Already included in package.json for compress_pdf
        //    const pdfDoc = await PDFDocument.load(pdfBytes);

        // 2. **Iterate through pages and extract images OR render pages to images:**
        //    This is the most challenging part in a serverless environment.
        //    a) If images are already embedded: Iterate through `pdfDoc.getPages()`,
        //       then `page.getContentStream()`, `page.getXObjects()`, `page.getGraphicsResources()`, etc.
        //       to find image objects. Extract their raw bytes.
        //       Example (simplified, requires deep PDF knowledge):
        //       for (const page of pdfDoc.getPages()) {
        //           // Logic to find and extract image bytes from page resources
        //           const imageBytes = await getImageBytesFromPdfPage(page); // Custom helper function
        //           if (imageBytes) {
        //               // ... proceed to OCR
        //           }
        //       }
        //
        //    b) If PDF is a scanned image (no embedded image objects, just a visual layer):
        //       You need to RENDER the PDF page to an image (e.g., PNG, JPEG) in memory.
        //       This typically requires native Node.js libraries like 'node-canvas' or 'sharp',
        //       which are hard to deploy on Netlify Functions due to their C++ dependencies.
        //       Example:
        //       const imageBuffer = await renderPdfPageToImage(pdfBytes, pageNumber); // Custom helper function
        //       // ... proceed to OCR
        */

        /*
        // 3. **Call an external OCR API (e.g., Google Cloud Vision AI):**
        //    This requires an API key and sending the image data over the network.
        //    Example using axios (assuming 'axios' is installed and `GOOGLE_VISION_API_KEY` is set as Netlify environment variable):
        //
        //    const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
        //    if (GOOGLE_VISION_API_KEY) {
        //        const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
        //        const imageBase64ForVision = Buffer.from(imageBytes).toString('base64'); // Image bytes from step 2
        //
        //        const visionPayload = {
        //            requests: [{
        //                image: { content: imageBase64ForVision },
        //                features: [{ type: 'TEXT_DETECTION' }]
        //            }]
        //        };
        //
        //        const visionResponse = await axios.post(visionApiUrl, visionPayload, {
        //            headers: { 'Content-Type': 'application/json' }
        //        });
        //
        //        if (visionResponse.data.responses && visionResponse.data.responses[0].fullTextAnnotation) {
        //            const ocrText = visionResponse.data.responses[0].fullTextAnnotation.text;
        //            // Combine OCR text with existing extractedText
        //            if (ocrText && ocrText.length > extractedText.length * 0.5) { // Simple heuristic: if OCR adds significantly
        //                extractedText += '\n\n--- OCR from Image ---\n\n' + ocrText;
        //            }
        //        }
        //    } else {
        //        console.warn("GOOGLE_VISION_API_KEY not set. OCR functionality is disabled.");
        //    }
        */

        // End of Conceptual OCR Section

        // Determine a suitable filename for the downloaded text file
        const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.');
        const textFilename = `${nameWithoutExt}_converted.txt`;

        // Encode the extracted text to base64
        const textBase64 = Buffer.from(extractedText).toString('base64');

        // Return the response as JSON containing the base64 encoded text and metadata
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json', // Indicate that the response body is JSON
                'Access-Control-Allow-Origin': '*', // Crucial for CORS to allow frontend to access
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
                fileContentBase64: textBase64, // The base64 encoded text content
                fileName: textFilename, // The suggested filename for download
                mimeType: 'text/plain' // The MIME type of the content
            })
        };

    } catch (error) {
        console.error('Error in Netlify pdf_to_text function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: `Failed to convert PDF to text: ${error.message}. OCR functionality (if attempted) may be limited by environment or API configuration.` })
        };
    }
};
