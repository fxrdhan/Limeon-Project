// supabase/functions/confirm-invoice/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
async function reportMetric(metric, supabase) {
  try {
    // Fix: menggunakan nama column yang sesuai dengan schema database
    const metricWithCorrectSchema = {
      timestamp: metric.timestamp,
      endpoint: metric.endpoint,
      processing_time: metric.processing_time,
      status: metric.status,
      file_size: metric.file_size,
      file_name: metric.file_name,
      response_size: metric.response_size,
      error_message: metric.error_message,
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
      console.log("🔄 Parsing request body...");
      const { invoiceData, imageIdentifier } = await req.json();
      if (!invoiceData || !imageIdentifier) {
        return new Response(
          JSON.stringify({
            error: "Data faktur dan imageIdentifier diperlukan",
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
      console.log(`📋 Processing invoice confirmation for: ${imageIdentifier}`);
      console.log(
        `📄 Invoice number: ${invoiceData.invoice_information?.invoice_number}`,
      );
      try {
        // Prepare invoice record for database
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
        // Validate required fields
        if (
          !eInvoiceRecord.invoice_number ||
          !eInvoiceRecord.invoice_date ||
          !eInvoiceRecord.supplier_name ||
          !eInvoiceRecord.customer_name
        ) {
          return new Response(
            JSON.stringify({
              error:
                "Data faktur tidak lengkap (nomor faktur, tanggal faktur, nama supplier, atau nama customer kosong).",
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
        // Insert invoice data into database
        console.log("💾 Inserting invoice data into database...");
        const { data: insertedInvoice, error: insertError } = await supabase
          .from("e_invoices")
          .insert([eInvoiceRecord])
          .select();
        if (insertError) {
          console.error("Supabase insert error:", insertError);
          throw insertError;
        }
        console.log("✅ Invoice data inserted successfully");
        // Move image from staging to history in Supabase Storage
        console.log(
          `📁 Moving image from staging to history: ${imageIdentifier}`,
        );
        try {
          // First, copy the file to history folder
          const { data: copyData, error: copyError } = await supabase.storage
            .from("invoice-images")
            .copy(`staging/${imageIdentifier}`, `history/${imageIdentifier}`);
          if (copyError) {
            console.warn(
              "⚠️ Failed to copy image to history:",
              copyError.message,
            );
          } else {
            console.log("✅ Image copied to history successfully");
            // If copy successful, remove from staging
            const { error: removeError } = await supabase.storage
              .from("invoice-images")
              .remove([`staging/${imageIdentifier}`]);
            if (removeError) {
              console.warn(
                "⚠️ Failed to remove image from staging:",
                removeError.message,
              );
            } else {
              console.log(
                `✅ Image ${imageIdentifier} moved to history successfully`,
              );
            }
          }
        } catch (storageError) {
          console.warn("⚠️ Storage operation error:", storageError);
          // Don't fail the whole operation if storage move fails
        }
        const responseSize = JSON.stringify(insertedInvoice).length;
        // Report success metric
        await reportMetric(
          {
            timestamp,
            endpoint: "confirm-invoice",
            processing_time: Date.now() - startTime,
            status: "success",
            file_name: imageIdentifier,
            response_size: responseSize,
            file_size: null, // No file size for this operation
          },
          supabase,
        );
        console.log(
          `🎉 Invoice confirmation completed successfully in ${Date.now() - startTime}ms`,
        );
        return new Response(
          JSON.stringify({
            message: "Faktur berhasil dikonfirmasi dan disimpan ke database.",
            data: insertedInvoice,
            imageIdentifier,
            metadata: {
              processingTime: `${Date.now() - startTime}ms`,
              timestamp: timestamp,
            },
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error("Confirm invoice error:", error);
        await reportMetric(
          {
            timestamp,
            endpoint: "confirm-invoice",
            processing_time: Date.now() - startTime,
            status: "error",
            file_name: imageIdentifier,
            error_message: error.message,
            file_size: null,
          },
          supabase,
        );
        return new Response(
          JSON.stringify({
            error: "Gagal mengkonfirmasi faktur",
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
    }
    return new Response(
      JSON.stringify({
        error: "Method tidak didukung",
        allowedMethods: ["POST"],
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
