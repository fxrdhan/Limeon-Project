const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { getGeminiResponse } = require("./geminiService");
const { parseAndTransformResponse } = require("./responseParser");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}${path.extname(file.originalname)}`;
        req.fileIdentifier = uniqueFilename;
        cb(null, uniqueFilename);
    },
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "uploads", "staging");
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
});
const upload = multer({ storage: storage });

const uploadsDir = path.join(__dirname, "uploads");
const stagingDir = path.join(uploadsDir, "staging");
const historyDir = path.join(uploadsDir, "history");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
fs.mkdirSync(stagingDir, { recursive: true });
fs.mkdirSync(historyDir, { recursive: true });

app.post("/api/extract-invoice", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Tidak ada file yang diunggah" });
        }

        const imageIdentifier = req.fileIdentifier;
        const imagePath = req.file.path;

        const prompt =
            'Anda adalah asisten AI untuk ekstraksi data faktur farmasi. Tugas Anda adalah mengekstrak seluruh teks dari gambar faktur dan mengubahnya ke format JSON terstruktur.\\n\\nPenting: OUTPUT ANDA HANYA BERUPA JSON. JANGAN sertakan schema, instruksi, atau teks lain pada respons Anda.\\n\\nEkstrak data faktur ke dalam struktur JSON berikut:\n{\n  "company": {\n    "name": "string",\n    "address": "string",\n  },\n  "invoice": {\n    "number": "string",\n    "date": "string",\n    "due_date": "string"\n  },\n  "customer": {\n    "name": "string",\n    "address": "string"\n  },\n  "products": [\n    {\n      "sku": "string",\n      "product_name": "string",\n      "count": number,\n      "unit": "string",\n      "batch_no": "string",\n      "expiry_date": "string",\n      "price_per_unit": "currency",\n      "discount": "string",\n      "total_price": "currency"\n    }\n  ],\n  "payment_summary": {\n    "total_price": "currency",\n    "vat": "string",\n    "total_invoice": "currency"\n  },\n  "additional_information": {\n    "checked_by": "string"\n  }\n}\nAturan ekstraksi:\n1. Hapus semua tag newline (\\\\n) dari hasil ekstraksi\n2. Format tanggal harus sesuai dengan pola yang ditentukan\n3. Pastikan unit sesuai dengan kemasan pada faktur\n4. Pastikan gelar ditulis dengan benar: S. Farm.';

        const rawGeminiText = await getGeminiResponse(imagePath, prompt);

        console.log("Raw response from Gemini:", rawGeminiText);
        try {
            const transformedData = parseAndTransformResponse(rawGeminiText);
            res.json({ ...transformedData, imageIdentifier: imageIdentifier });
        } catch (e) {
            console.error("Error parsing JSON:", e);
            res.json({ rawText: rawGeminiText, imageIdentifier: imageIdentifier });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            error: "Terjadi kesalahan saat memproses gambar",
            details: error.message,
        });
    }
});

app.post("/api/regenerate-invoice", async (req, res) => {
    const { imageIdentifier } = req.body;

    if (!imageIdentifier) {
        return res.status(400).json({ error: "imageIdentifier diperlukan" });
    }

    const imagePath = path.join(__dirname, "uploads", "staging", imageIdentifier);

    if (!fs.existsSync(imagePath)) {
        return res
            .status(404)
            .json({ error: "File gambar tidak ditemukan di staging" });
    }

    const prompt =
        'Anda adalah asisten AI untuk ekstraksi data faktur farmasi. Tugas Anda adalah mengekstrak seluruh teks dari gambar faktur dan mengubahnya ke format JSON terstruktur.\\n\\nPenting: OUTPUT ANDA HANYA BERUPA JSON. JANGAN sertakan schema, instruksi, atau teks lain pada respons Anda.\\n\\nEkstrak data faktur ke dalam struktur JSON berikut:\n{\n  "company": {\n    "name": "string",\n    "address": "string",\n  },\n  "invoice": {\n    "number": "string",\n    "date": "string",\n    "due_date": "string"\n  },\n  "customer": {\n    "name": "string",\n    "address": "string"\n  },\n  "products": [\n    {\n      "sku": "string",\n      "product_name": "string",\n      "count": number,\n      "unit": "string",\n      "batch_no": "string",\n      "expiry_date": "string",\n      "price_per_unit": "currency",\n      "discount": "string",\n      "total_price": "currency"\n    }\n  ],\n  "payment_summary": {\n    "total_price": "currency",\n    "vat": "string",\n    "total_invoice": "currency"\n  },\n  "additional_information": {\n    "checked_by": "string"\n  }\n}\nAturan ekstraksi:\n1. Hapus semua tag newline (\\\\n) dari hasil ekstraksi\n2. Format tanggal harus sesuai dengan pola yang ditentukan\n3. Pastikan unit sesuai dengan kemasan pada faktur\n4. Pastikan gelar ditulis dengan benar: S. Farm.';

    try {
        const rawGeminiText = await getGeminiResponse(imagePath, prompt);
        console.log("Raw response from Gemini (regenerate):", rawGeminiText);
        const transformedData = parseAndTransformResponse(rawGeminiText);
        res.json({ ...transformedData, imageIdentifier: imageIdentifier });
    } catch (error) {
        console.error("Error regenerating invoice:", error);
        res
            .status(500)
            .json({
                error: "Terjadi kesalahan saat memproses ulang gambar",
                details: error.message,
            });
    }
});

app.post("/api/confirm-invoice", async (req, res) => {
    const { invoiceData, imageIdentifier } = req.body;

    if (!invoiceData || !imageIdentifier) {
        return res
            .status(400)
            .json({ error: "Data faktur dan imageIdentifier diperlukan" });
    }

    const stagingPath = path.resolve(
        __dirname,
        "uploads",
        "staging",
        imageIdentifier
    );
    const historyPath = path.resolve(
        __dirname,
        "uploads",
        "history",
        imageIdentifier
    );

    try {
        const eInvoiceRecord = {
            invoice_number: invoiceData.invoice_information?.invoice_number,
            invoice_date: invoiceData.invoice_information?.invoice_date,
            due_date: invoiceData.invoice_information?.due_date,
            supplier_name: invoiceData.company_details?.name,
            supplier_address: invoiceData.company_details?.address,
            customer_name: invoiceData.customer_information?.customer_name,
            customer_address: invoiceData.customer_information?.customer_address,
            total_price: invoiceData.payment_summary?.total_price,
            ppn: invoiceData.payment_summary?.vat,
            total_invoice: invoiceData.payment_summary?.invoice_total,
            checked_by: invoiceData.additional_information?.checked_by,
            json_data: invoiceData,
            is_processed: false,
        };

        if (
            !eInvoiceRecord.invoice_number ||
            !eInvoiceRecord.invoice_date ||
            !eInvoiceRecord.supplier_name ||
            !eInvoiceRecord.customer_name
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Data faktur tidak lengkap (nomor faktur, tanggal faktur, nama supplier, atau nama customer kosong).",
                });
        }

        const { data: insertedInvoice, error: insertError } = await supabase
            .from("e_invoices")
            .insert([eInvoiceRecord])
            .select();

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            throw insertError;
        }

        if (fs.existsSync(stagingPath)) {
            fs.renameSync(stagingPath, historyPath);
            console.log(`Gambar ${imageIdentifier} dipindahkan ke history.`);
        } else {
            console.warn(
                `Gambar ${imageIdentifier} tidak ditemukan di staging saat konfirmasi.`
            );
        }

        res
            .status(200)
            .json({
                message: "Faktur berhasil dikonfirmasi dan disimpan ke database.",
                data: insertedInvoice,
            });
    } catch (error) {
        console.error("Error confirming invoice:", error);
        res
            .status(500)
            .json({ error: "Gagal mengkonfirmasi faktur", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});
