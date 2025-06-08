// api/pdf_to_text.js
const pdf = require('pdf-parse'); // For parsing PDF and extracting text from searchable PDFs
// If you were to implement OCR with an external service, you might need a library for HTTP requests:
// const axios = require('axios'); // Example: for making HTTP requests to Google Cloud Vision API

module.exports = async (req, res) => { // Vercel functions use (req, res) pattern
    // Handle CORS preflight request (OPTIONS method)
    if (req.method === 'OPTIONS') {
        res.status(204).setHeader('Access-Control-Allow-Origin', '*')
                       .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
                       .setHeader('Access-Control-Allow-Headers', 'Content-Type')
                       .end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed. Only POST requests are accepted.' });
        return;
    }

    try {
        if (!req.body) {
            res.status(400).json({ error: 'No request body provided.' });
            return;
        }

        // Vercel handles JSON body parsing automatically for POST requests with Content-Type: application/json
        const requestData = req.body;
        const pdfFileBase64 = requestData.pdfFileBase64;
        const originalFilename = requestData.fileName || 'document.pdf';

        if (!pdfFileBase64) {
            res.status(400).json({ error: 'No PDF file data provided.' });
            return;
        }

        // Convert base64 PDF data back to a Buffer
        const pdfBytes = Buffer.from(pdfFileBase64, 'base64');

        // --- SECTION 1: Extracting Text from Searchable PDFs (Existing Functionality) ---
        const data = await pdf(pdfBytes); 
        let extractedText = data.text; // Text extracted from searchable layers

        // --- SECTION 2: Conceptual OCR for Text in Images ---
        // As discussed, a full OCR implementation is complex and requires external services (e.g., Google Cloud Vision AI).
        // This section remains a conceptual placeholder.
        /*
        // Example for Google Cloud Vision AI (requires project setup, API key, and 'axios' dependency):
        // const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY; // Set this in Vercel project settings
        // if (GOOGLE_VISION_API_KEY) {
        //     // Logic to extract image(s) from PDF page(s) and send to Vision API
        //     // This often involves rendering PDF pages to images using a library like 'pdf-image' or 'sharp'
        //     // which have native dependencies and can be challenging in serverless environments.
        //     // Alternatively, if images are directly extractable from the PDF, use a PDF manipulation lib.
        //     // Then, send image to OCR API:
        //     // const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
        //     // const visionPayload = { ... }; // Construct payload with image data
        //     // const visionResponse = await axios.post(visionApiUrl, visionPayload);
        //     // if (visionResponse.data.responses && visionResponse.data.responses[0].fullTextAnnotation) {
        //     //     const ocrText = visionResponse.data.responses[0].fullTextAnnotation.text;
        //     //     // Combine ocrText with extractedText
        //     //     extractedText += '\n\n--- OCR from Image ---\n\n' + ocrText;
        //     // }
        // } else {
        //     console.warn("GOOGLE_VISION_API_KEY not set. OCR functionality is disabled.");
        // }
        */

        // End of Conceptual OCR Section

        const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.');
        const textFilename = `${nameWithoutExt}_converted.txt`;

        const textBase64 = Buffer.from(extractedText).toString('base64');

        res.status(200).json({
            fileContentBase64: textBase64,
            fileName: textFilename,
            mimeType: 'text/plain'
        });

    } catch (error) {
        console.error('Error in Vercel pdf_to_text function:', error);
        res.status(500).json({ error: `Failed to convert PDF to text: ${error.message}. OCR functionality (if attempted) may be limited by environment or API configuration.` });
    }
};
