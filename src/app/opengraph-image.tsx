import { ImageResponse } from "next/og";

export const alt = "GhushSite — the public bribe ledger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0b0b0c",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(220,38,38,0.35), transparent 55%)",
          color: "#f5f5f4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: 30,
            color: "#f87171",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: "#ef4444",
              display: "flex",
            }}
          />
          GhushSite · Live Public Ledger
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.08,
            marginTop: 28,
            maxWidth: 980,
          }}
        >
          Someone asked for extra. You remember how much.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#a8a29e",
            marginTop: 32,
            maxWidth: 900,
          }}
        >
          An anonymous, crowdsourced record of unofficial payment demands across Bangladesh.
        </div>
      </div>
    ),
    { ...size },
  );
}
