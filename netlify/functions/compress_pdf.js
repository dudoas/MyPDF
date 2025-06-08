// netlify/functions/compress_pdf.js
const { PDFDocument } = require('pdf-lib');

exports.handler = async function(event, context) {
    // Handle CORS preflight request (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No content needed for preflight success
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
                'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS methods
                'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
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

        // Netlify functions receive the request body as a string, possibly base64 encoded.
        // We expect a JSON payload with pdfFileBase64, compressionLevel, and fileName.
        const requestData = JSON.parse(event.body);
        const pdfFileBase64 = requestData.pdfFileBase64;
        // const compressionLevel = requestData.compressionLevel || 'recommended'; // pdf-lib doesn't use this directly for lossy compression
        const originalFilename = requestData.fileName || 'document.pdf';

        if (!pdfFileBase64) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'No PDF file data provided in the request body.' })
            };
        }

        // Convert base64 PDF data back to a Buffer
        const pdfBytes = Buffer.from(pdfFileBase64, 'base64');
        const originalPdfDoc = await PDFDocument.load(pdfBytes);

        // Create a new PDF document to copy pages into.
        // This process by pdf-lib automatically performs stream compression and object optimization.
        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, originalPdfDoc.getPageIndices());
        copiedPages.forEach(page => newPdfDoc.addPage(page));

        // Save the new PDF. pdf-lib applies its default compression settings here.
        const compressedPdfBytes = await newPdfDoc.save();

        // Encode the compressed PDF back to base64 for sending to the client
        const compressedPdfBase64 = Buffer.from(compressedPdfBytes).toString('base64');

        // Determine a suitable filename for the downloaded file
        const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.');
        const compressedFilename = `${nameWithoutExt}_compressed.pdf`;

        // Return the response as JSON containing the base64 encoded file and metadata
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json', // Indicate that the response body is JSON
                'Access-Control-Allow-Origin': '*', // Crucial for CORS to allow frontend to access
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
                body: compressedPdfBase64, // The base64 encoded PDF content
                isBase64Encoded: true,     // Signal that 'body' content is base64 encoded
                fileName: compressedFilename, // The suggested filename for download
                originalSize: pdfBytes.length, // Original size in bytes
                compressedSize: compressedPdfBytes.length // Compressed size in bytes
            })
        };

    } catch (error) {
        console.error('Error in Netlify compress_pdf function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: `Failed to compress PDF: ${error.message}` })
        };
    }
};
