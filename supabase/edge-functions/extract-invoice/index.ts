// supabase/functions/extract-invoice/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// Configuration constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
// Utility functions for parsing
function parseNumericValue(value) {
  if (!value || typeof value !== "string") return 0;
  let cleaned = value.replace(/Rp|\s/g, "");
  const sepCount = (cleaned.match(/[.,]/g) || []).length;
  if (sepCount > 1) {
    if (cleaned.indexOf(",") === -1 && cleaned.indexOf(".") !== -1) {
      const parts = cleaned.split(".");
      if (parts.length > 2 && parts[parts.length - 1].length === 2) {
        return (
          parseFloat(
            parts.slice(0, -1).join("") + "." + parts[parts.length - 1],
          ) || 0
        );
      }
    }
    const lastSep =
      cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",") ? "." : ",";
    cleaned = cleaned
      .split(lastSep)
      .join("DEC")
      .replace(/[.,]/g, "")
      .replace("DEC", ".");
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  return parseFloat(cleaned) || 0;
}
function parseDiscountValue(value) {
  if (!value || typeof value !== "string") return 0;
  const num = parseFloat(value.replace(/[%-]/g, ""));
  return num || 0;
}
function parseAndTransformResponse(rawText) {
  try {
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = match?.[1]?.trim() || rawText.trim();
    const rawJsonData = JSON.parse(jsonString);
    return {
      company_details: {
        name: rawJsonData.company?.name,
        address: rawJsonData.company?.address,
      },
      invoice_information: {
        invoice_number: rawJsonData.invoice?.number,
        invoice_date: rawJsonData.invoice?.date,
        so_number: rawJsonData.invoice?.so_number,
        due_date: rawJsonData.invoice?.due_date,
      },
      customer_information: {
        customer_name: rawJsonData.customer?.name,
        customer_address: rawJsonData.customer?.address,
      },
      product_list:
        rawJsonData.products?.map((p) => ({
          sku: p.sku,
          product_name: p.product_name,
          quantity: p.count,
          unit: p.unit,
          batch_number: p.batch_no,
          expiry_date: p.expiry_date,
          unit_price: parseNumericValue(p.price_per_unit),
          discount: parseDiscountValue(p.discount),
          total_price: parseNumericValue(p.total_price),
        })) || [],
      payment_summary: {
        total_price: parseNumericValue(
          rawJsonData.payment_summary?.total_price,
        ),
        vat: parseNumericValue(rawJsonData.payment_summary?.vat),
        invoice_total: parseNumericValue(
          rawJsonData.payment_summary?.total_invoice,
        ),
      },
      additional_information: {
        checked_by: rawJsonData.additional_information?.checked_by,
      },
    };
  } catch (e) {
    console.error("JSON parse error:", e);
    return {
      rawText,
    };
  }
}
async function reportMetric(metric, supabase) {
  try {
    // Fix: menggunakan nama column yang sesuai dengan schema database
    const metricWithCorrectSchema = {
      timestamp: metric.timestamp,
      endpoint: metric.endpoint,
      processing_time: metric.processingTime,
      status: metric.status,
      file_size: metric.fileSize,
      file_name: metric.fileName,
      response_size: metric.responseSize,
      error_message: metric.errorMessage, // Fix: gunakan error_message bukan errorMessage
    };
    const { error } = await supabase
      .from("api_metrics")
      .insert([metricWithCorrectSchema]);
    if (error) {
      console.warn("Failed to report metric:", error.message);
    }
  } catch (error) {
    console.warn("Failed to report metric:", error);
  }
}
// Fixed: Simplified base64 conversion - tidak menggunakan chunked conversion
function convertToBase64(uint8Array) {
  try {
    // Convert uint8Array to string menggunakan TextDecoder jika perlu
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("Base64 conversion error:", error);
    throw new Error("Failed to convert file to base64");
  }
}
function validateFile(file) {
  // Check file type
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Format file tidak didukung. Gunakan: ${SUPPORTED_TYPES.join(", ")}`,
    };
  }
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File terlalu besar. Ukuran: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maksimum: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "File kosong atau tidak valid",
    };
  }
  return {
    valid: true,
  };
}
async function getGeminiResponse(imageBase64, mimeType, prompt) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const MODEL_ID = "gemini-2.0-flash";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "text/plain",
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
    ],
  };
  console.log(
    `🤖 Calling Gemini API with ${imageBase64.length} chars base64 data`,
  );
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Gemini API error ${response.status}:`, errorText);
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }
  const responseData = await response.json();
  console.log("✅ Gemini API response received");
  // Extract text from Gemini response
  if (
    responseData.candidates &&
    responseData.candidates[0] &&
    responseData.candidates[0].content
  ) {
    const parts = responseData.candidates[0].content.parts;
    if (parts && parts[0] && parts[0].text) {
      return parts[0].text;
    }
  }
  throw new Error("Invalid response format from Gemini API");
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  console.log(`🚀 Request received: ${req.method} ${req.url}`);
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    if (req.method === "POST") {
      const startTime = Date.now();
      const timestamp = new Date().toISOString();
      // Check Content-Type
      const contentType = req.headers.get("content-type") || "";
      console.log(`📦 Content-Type: ${contentType}`);
      if (!contentType.includes("multipart/form-data")) {
        return new Response(
          JSON.stringify({
            error: "Content-Type harus multipart/form-data untuk upload file",
            received: contentType,
            expected: "multipart/form-data",
            tip: "Gunakan -F untuk curl atau FormData untuk JavaScript",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      // Parse FormData with enhanced error handling
      let imageFile = null;
      let imageIdentifier = "";
      let fileSize = 0;
      try {
        console.log("🔄 Parsing FormData...");
        const formData = await req.formData();
        console.log("✅ FormData parsed successfully");
        imageFile = formData.get("image");
        if (!imageFile) {
          return new Response(
            JSON.stringify({
              error: 'Field "image" tidak ditemukan dalam FormData',
              availableFields: Array.from(formData.keys()),
              tip: 'Pastikan menggunakan field name "image"',
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }
        console.log(
          `📁 File received: ${imageFile.name}, size: ${imageFile.size}, type: ${imageFile.type}`,
        );
      } catch (formDataError) {
        console.error("❌ FormData parsing error:", formDataError);
        await reportMetric(
          {
            timestamp,
            endpoint: "extract-invoice",
            processingTime: Date.now() - startTime,
            status: "error",
            errorMessage: `FormData parsing failed: ${formDataError.message}`,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: "Gagal memproses FormData",
            details: formDataError.message,
            tip: 'Pastikan request menggunakan multipart/form-data dengan field "image"',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      // Validate file
      const validation = validateFile(imageFile);
      if (!validation.valid) {
        console.log(`❌ File validation failed: ${validation.error}`);
        await reportMetric(
          {
            timestamp,
            endpoint: "extract-invoice",
            processingTime: Date.now() - startTime,
            status: "error",
            fileSize: imageFile.size,
            errorMessage: validation.error,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: validation.error,
            fileInfo: {
              name: imageFile.name,
              size: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
              type: imageFile.type,
            },
            limits: {
              maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
              supportedTypes: SUPPORTED_TYPES,
            },
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      // Generate identifier and get file info
      imageIdentifier = `${Date.now()}.${imageFile.name.split(".").pop()}`;
      fileSize = imageFile.size;
      console.log(`🏷️ Generated identifier: ${imageIdentifier}`);
      // Convert file to base64 - Fixed version
      console.log("🔄 Converting file to base64...");
      let base64String;
      try {
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        base64String = convertToBase64(uint8Array);
        console.log(
          `✅ Base64 conversion complete, length: ${base64String.length}`,
        );
      } catch (conversionError) {
        console.error("❌ Base64 conversion error:", conversionError);
        await reportMetric(
          {
            timestamp,
            endpoint: "extract-invoice",
            processingTime: Date.now() - startTime,
            status: "error",
            fileSize,
            fileName: imageIdentifier,
            errorMessage: `Base64 conversion failed: ${conversionError.message}`,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: "Gagal mengkonversi file ke base64",
            details: conversionError.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      // Upload to Supabase Storage
      console.log("🔄 Uploading to Supabase Storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("invoice-images")
        .upload(`staging/${imageIdentifier}`, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });
      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        await reportMetric(
          {
            timestamp,
            endpoint: "extract-invoice",
            processingTime: Date.now() - startTime,
            status: "error",
            fileSize,
            fileName: imageIdentifier,
            errorMessage: uploadError.message,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: "Gagal mengupload file ke storage",
            details: uploadError.message,
            tip: "Coba lagi dengan file yang berbeda",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      console.log("✅ File uploaded successfully to storage");
      const prompt =
        'Anda adalah asisten AI untuk ekstraksi data faktur farmasi. Tugas Anda adalah mengekstrak seluruh teks dari gambar faktur dan mengubahnya ke format JSON terstruktur.\\n\\nPenting: OUTPUT ANDA HANYA BERUPA JSON. JANGAN sertakan schema, instruksi, atau teks lain pada respons Anda.\\n\\nEkstrak data faktur ke dalam struktur JSON berikut:\n{\n  "company": {\n    "name": "string",\n    "address": "string",\n  },\n  "invoice": {\n    "number": "string",\n    "date": "string",\n    "due_date": "string"\n  },\n  "customer": {\n    "name": "string",\n    "address": "string"\n  },\n  "products": [\n    {\n      "sku": "string",\n      "product_name": "string",\n      "count": number,\n      "unit": "string",\n      "batch_no": "string",\n      "expiry_date": "string",\n      "price_per_unit": "currency",\n      "discount": "string",\n      "total_price": "currency"\n    }\n  ],\n  "payment_summary": {\n    "total_price": "currency",\n    "vat": "string",\n    "total_invoice": "currency"\n  },\n  "additional_information": {\n    "checked_by": "string"\n  }\n}\nAturan ekstraksi:\n1. Hapus semua tag newline (\\\\n) dari hasil ekstraksi\n2. Format tanggal harus sesuai dengan pola yang ditentukan\n3. Pastikan unit sesuai dengan kemasan pada faktur\n4. Pastikan gelar ditulis dengan benar: S. Farm.';
      try {
        // Call Gemini API
        console.log("🤖 Calling Gemini API...");
        const rawGeminiText = await getGeminiResponse(
          base64String,
          imageFile.type,
          prompt,
        );
        console.log("✅ Gemini API response received");
        // Parse response
        console.log("🔄 Parsing Gemini response...");
        const transformedData = parseAndTransformResponse(rawGeminiText);
        const responseSize = JSON.stringify(transformedData).length;
        console.log("✅ Response parsed successfully");
        // Report success metric
        await reportMetric(
          {
            timestamp,
            endpoint: "extract-invoice",
            processingTime: Date.now() - startTime,
            status: "success",
            fileSize,
            fileName: imageIdentifier,
            responseSize,
          },
          supabase,
        );
        console.log(
          `🎉 Request completed successfully in ${Date.now() - startTime}ms`,
        );
        return new Response(
          JSON.stringify({
            ...transformedData,
            imageIdentifier,
            metadata: {
              processingTime: `${Date.now() - startTime}ms`,
              fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
              timestamp: timestamp,
            },
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error("❌ Processing error:", error);
        await reportMetric(
          {
            timestamp,
            endpoint: "extract-invoice",
            processingTime: Date.now() - startTime,
            status: "error",
            fileSize,
            fileName: imageIdentifier,
            errorMessage: error.message,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: "Terjadi kesalahan saat memproses gambar",
            details: error.message,
            tip: "Coba lagi dengan gambar yang lebih kecil atau format yang berbeda",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
    }
    return new Response(
      JSON.stringify({
        error: "Method tidak didukung",
        allowedMethods: ["POST"],
        tip: "Gunakan POST dengan multipart/form-data untuk upload file",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
