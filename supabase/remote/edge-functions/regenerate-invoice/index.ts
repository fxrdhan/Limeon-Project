// supabase/functions/regenerate-invoice/index.ts
// Regenerate version - reprocess existing uploaded invoice
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// No file validation needed - file already exists in storage
// Utility functions for parsing (unchanged)
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
      endpoint: "regenerate-invoice",
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
      // Parse JSON body instead of FormData
      let requestBody;
      try {
        requestBody = await req.json();
      } catch (parseError) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON body",
            details: parseError.message,
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
      const { imageIdentifier } = requestBody;
      if (!imageIdentifier) {
        return new Response(
          JSON.stringify({
            error: "imageIdentifier diperlukan",
            tip: "Kirim JSON dengan field imageIdentifier",
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
      console.log(`🔄 Processing existing image: ${imageIdentifier}`);
      // Download file from storage instead of parsing FormData
      try {
        console.log("📥 Downloading file from storage...");
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("invoice-images")
          .download(`staging/${imageIdentifier}`);
        if (downloadError || !fileData) {
          return new Response(
            JSON.stringify({
              error: "File tidak ditemukan di storage",
              details: downloadError?.message || "File not found",
              imageIdentifier,
            }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }
        console.log(`✅ File downloaded successfully: ${fileData.size} bytes`);
        // Convert downloaded file to required format
        const fileSize = fileData.size;
        const mimeType = fileData.type || "image/png"; // Default fallback
        // Convert downloaded blob to base64
        console.log("🔄 Converting downloaded file to base64...");
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = convertToBase64(uint8Array);
        console.log(
          `✅ Base64 conversion complete, length: ${base64String.length}`,
        );
        const prompt =
          'Anda adalah asisten AI untuk ekstraksi data faktur farmasi. Tugas Anda adalah mengekstrak seluruh teks dari gambar faktur dan mengubahnya ke format JSON terstruktur.\\n\\nPenting: OUTPUT ANDA HANYA BERUPA JSON. JANGAN sertakan schema, instruksi, atau teks lain pada respons Anda.\\n\\nEkstrak data faktur ke dalam struktur JSON berikut:\n{\n  "company": {\n    "name": "string",\n    "address": "string",\n  },\n  "invoice": {\n    "number": "string",\n    "date": "string",\n    "due_date": "string"\n  },\n  "customer": {\n    "name": "string",\n    "address": "string"\n  },\n  "products": [\n    {\n      "sku": "string",\n      "product_name": "string",\n      "count": number,\n      "unit": "string",\n      "batch_no": "string",\n      "expiry_date": "string",\n      "price_per_unit": "currency",\n      "discount": "string",\n      "total_price": "currency"\n    }\n  ],\n  "payment_summary": {\n    "total_price": "currency",\n    "vat": "string",\n    "total_invoice": "currency"\n  },\n  "additional_information": {\n    "checked_by": "string"\n  }\n}\nAturan ekstraksi:\n1. Hapus semua tag newline (\\\\n) dari hasil ekstraksi\n2. Format tanggal harus sesuai dengan pola yang ditentukan\n3. Pastikan unit sesuai dengan kemasan pada faktur\n4. Pastikan gelar ditulis dengan benar: S. Farm.';
        // Call Gemini API with the existing file
        console.log("🤖 Calling Gemini API for regeneration...");
        const rawGeminiText = await getGeminiResponse(
          base64String,
          mimeType,
          prompt,
        );
        console.log("✅ Gemini API response received");
        // Parse response (same as extract-invoice)
        console.log("🔄 Parsing Gemini response...");
        const transformedData = parseAndTransformResponse(rawGeminiText);
        const responseSize = JSON.stringify(transformedData).length;
        console.log("✅ Response parsed successfully");
        // Report success metric
        await reportMetric(
          {
            timestamp,
            endpoint: "regenerate-invoice",
            processingTime: Date.now() - startTime,
            status: "success",
            fileSize,
            fileName: imageIdentifier,
            responseSize,
          },
          supabase,
        );
        console.log(
          `🎉 Regeneration completed successfully in ${Date.now() - startTime}ms`,
        );
        return new Response(
          JSON.stringify({
            ...transformedData,
            imageIdentifier,
            metadata: {
              processingTime: `${Date.now() - startTime}ms`,
              fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
              timestamp: timestamp,
              regenerated: true,
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
            endpoint: "regenerate-invoice",
            processingTime: Date.now() - startTime,
            status: "error",
            fileName: imageIdentifier,
            errorMessage: error.message,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: "Terjadi kesalahan saat memproses ulang gambar",
            details: error.message,
            imageIdentifier,
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
        tip: "Gunakan POST dengan JSON body berisi imageIdentifier",
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
        stack: error.stack,
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
