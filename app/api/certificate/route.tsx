import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const madrassaName = searchParams.get("madrassaName") || "Milad Fest";
  const studentName = searchParams.get("studentName") || "Participant";
  const eventName = searchParams.get("eventName") || "the Event";
  const rankParam = searchParams.get("rank") || "";

  const rankNum = parseInt(rankParam, 10);
  const rankLabel = Number.isFinite(rankNum) && rankNum > 0
    ? ordinal(rankNum)
    : rankParam || "Participation";

  const rankColors: Record<string, string> = {
    "1st": "#D4AF37",
    "2nd": "#A8A9AD",
    "3rd": "#CD7F32",
  };
  const accentColor = rankColors[rankLabel] || "#0F766E";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FDFBF6",
          backgroundImage:
            "radial-gradient(circle at 0% 0%, #F3EFE3 0%, transparent 50%), radial-gradient(circle at 100% 100%, #F3EFE3 0%, transparent 50%)",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Outer border */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: `3px solid ${accentColor}`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 34,
            left: 34,
            right: 34,
            bottom: 34,
            border: "1px solid #C9BFA5",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 90px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#7A6F52",
              marginBottom: 10,
            }}
          >
            {madrassaName}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 700,
              color: "#2B2B2B",
              marginBottom: 6,
            }}
          >
            Certificate of Achievement
          </div>

          <div
            style={{
              display: "flex",
              width: 120,
              height: 3,
              backgroundColor: accentColor,
              marginBottom: 28,
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#4A4A4A",
              marginBottom: 8,
            }}
          >
            This certificate is proudly presented to
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 700,
              color: "#0F172A",
              marginBottom: 18,
              borderBottom: "2px solid #C9BFA5",
              paddingBottom: 10,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {studentName}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#4A4A4A",
              marginBottom: 20,
            }}
          >
            for securing
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 40px",
              backgroundColor: accentColor,
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {rankLabel} Place
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#2B2B2B",
            }}
          >
            in {eventName}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
