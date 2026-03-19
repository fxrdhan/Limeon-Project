import { describe, expect, it } from "vite-plus/test";
import {
  buildChatRemoteAssetRequestHeaders,
  extractRemoteHtmlTitle,
  isHtmlLikeRemoteAssetMimeType,
  resolveChatRemoteAssetUrl,
} from "./actions.ts";

describe("chat-remote-asset actions", () => {
  it("accepts public https asset urls", () => {
    expect(
      resolveChatRemoteAssetUrl({
        url: "https://example.com/assets/receipt.png",
      })
    ).toEqual({
      error: null,
      status: 200,
      url: "https://example.com/assets/receipt.png",
    });
  });

  it("rejects unsupported protocols and private hosts", () => {
    expect(
      resolveChatRemoteAssetUrl({
        url: "ftp://example.com/assets/receipt.png",
      })
    ).toEqual({
      error: "Only HTTP and HTTPS URLs are supported",
      status: 400,
      url: null,
    });

    expect(
      resolveChatRemoteAssetUrl({
        url: "https://127.0.0.1/assets/receipt.png",
      })
    ).toEqual({
      error: "Forbidden",
      status: 403,
      url: null,
    });

    expect(
      resolveChatRemoteAssetUrl({
        url: "https://[::1]/assets/receipt.png",
      })
    ).toEqual({
      error: "Forbidden",
      status: 403,
      url: null,
    });
  });

  it("detects html responses so embeds do not treat them as files", () => {
    expect(isHtmlLikeRemoteAssetMimeType("text/html; charset=utf-8")).toBe(
      true
    );
    expect(isHtmlLikeRemoteAssetMimeType("application/xhtml+xml")).toBe(true);
    expect(isHtmlLikeRemoteAssetMimeType("image/png")).toBe(false);
    expect(isHtmlLikeRemoteAssetMimeType("application/pdf")).toBe(false);
  });

  it("uses browser-like headers for remote asset fetches", () => {
    expect(
      buildChatRemoteAssetRequestHeaders(
        "image/*,application/pdf,application/octet-stream;q=0.9,*/*;q=0.1"
      )
    ).toEqual({
      Accept: "image/*,application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    });
  });

  it("extracts a readable title from google drive html", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Job Desk Minggu 4.pdf" />
          <title>Job Desk Minggu 4.pdf - Google Drive</title>
        </head>
      </html>
    `;

    expect(extractRemoteHtmlTitle(html)).toBe("Job Desk Minggu 4.pdf");
  });
});
