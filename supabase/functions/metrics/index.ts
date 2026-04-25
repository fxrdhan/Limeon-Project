// supabase/functions/metrics/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthenticatedUser } from "../_shared/edgeAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function calculateMetrics(supabase) {
  const { data: metrics, error } = await supabase
    .from("api_metrics")
    .select("*")
    .order("timestamp", {
      ascending: false,
    });
  if (error) {
    console.error("Error fetching metrics:", error);
    throw error;
  }

  const totalRequests = metrics.length;
  const successfulRequests = metrics.filter((m) => m.status === "success").length;
  const failedRequests = metrics.filter((m) => m.status === "error").length;
  const totalProcessingTime = metrics.reduce((sum, m) => sum + (m.processing_time || 0), 0);
  const averageProcessingTime = totalRequests > 0 ? totalProcessingTime / totalRequests : 0;

  const metricsWithFiles = metrics.filter((m) => m.file_size);
  const totalFilesProcessed = metricsWithFiles.length;
  const totalFileSize = metricsWithFiles.reduce((sum, m) => sum + (m.file_size || 0), 0);
  const averageFileSize = totalFilesProcessed > 0 ? totalFileSize / totalFilesProcessed : 0;

  const fileTypes = {};
  metricsWithFiles.forEach((m) => {
    if (m.file_name) {
      const ext = "." + m.file_name.split(".").pop()?.toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    }
  });

  const processingErrors = failedRequests;

  const metricsWithResponse = metrics.filter((m) => m.response_size);
  const totalResponseSize = metricsWithResponse.reduce((sum, m) => sum + (m.response_size || 0), 0);
  const averageResponseSize =
    metricsWithResponse.length > 0 ? totalResponseSize / metricsWithResponse.length : 0;

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    totalProcessingTime,
    averageProcessingTime,
    requestHistory: metrics.slice(0, 1000),
    fileMetrics: {
      totalFilesProcessed,
      totalFileSize,
      averageFileSize,
      fileTypes,
      processingErrors,
    },
    responseMetrics: {
      totalResponseSize,
      averageResponseSize,
      responseTypes: {},
      parseErrors: 0,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  console.log(`Request received: ${req.method} ${req.url}`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const authResult = await requireAuthenticatedUser(req, supabase, corsHeaders);
    if (authResult.response) {
      return authResult.response;
    }
    const url = new URL(req.url);
    const method = req.method;

    if (method === "GET" && url.pathname.endsWith("/metrics")) {
      console.log("Calculating metrics summary...");
      try {
        const metrics = await calculateMetrics(supabase);
        console.log(`Metrics calculated: ${metrics.totalRequests} total requests`);
        return new Response(JSON.stringify(metrics), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Failed to calculate metrics:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to calculate metrics",
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

    if (method === "GET" && url.pathname.endsWith("/metrics/recent")) {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      console.log(`Fetching ${limit} recent requests...`);
      try {
        const { data: recentRequests, error } = await supabase
          .from("api_metrics")
          .select("*")
          .order("timestamp", {
            ascending: false,
          })
          .limit(limit);
        if (error) {
          throw error;
        }
        console.log(`Retrieved ${recentRequests?.length || 0} recent requests`);
        return new Response(JSON.stringify(recentRequests), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Failed to fetch recent requests:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch recent requests",
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

    if (method === "POST" && url.pathname.endsWith("/metrics/clear")) {
      console.log("Clearing all metrics...");
      try {
        const { error } = await supabase.from("api_metrics").delete().not("id", "is", null);
        if (error) {
          throw error;
        }
        console.log("All metrics cleared successfully");
        return new Response(
          JSON.stringify({
            message: "Metrics cleared successfully",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error("Failed to clear metrics:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to clear metrics",
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

    if (method === "POST" && url.pathname.endsWith("/metrics/add")) {
      console.log("Adding new metric...");
      try {
        const metric = await req.json();
        const { error } = await supabase.from("api_metrics").insert([
          {
            timestamp: metric.timestamp,
            endpoint: metric.endpoint,
            processing_time: metric.processingTime || metric.processing_time,
            status: metric.status,
            file_size: metric.fileSize || metric.file_size,
            file_name: metric.fileName || metric.file_name,
            response_size: metric.responseSize || metric.response_size,
            error_message: metric.errorMessage || metric.error_message,
          },
        ]);
        if (error) {
          throw error;
        }
        console.log(`Metric added successfully: ${metric.endpoint}`);
        return new Response(
          JSON.stringify({
            message: "Metric added successfully",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error("Failed to add metric:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to add metric",
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

    console.log(`Unknown endpoint: ${method} ${url.pathname}`);
    return new Response(
      JSON.stringify({
        error: "Endpoint not found",
        method: method,
        pathname: url.pathname,
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
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
