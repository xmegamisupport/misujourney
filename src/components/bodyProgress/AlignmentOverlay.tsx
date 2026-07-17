"use client";

import type { ReactNode } from "react";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";

/** Semi-transparent, realistic body-outline guide drawn over the live camera —
 * white while guiding, cyan-green once the customer is correctly positioned.
 *
 * There are FOUR independent silhouettes, one per angle, each authored to match
 * the corresponding official reference photo (front & back are symmetric with a
 * face vs. long-hair cue; left & right are separate hand-drawn profiles, never a
 * single mirrored/rotated shape). The viewBox is a portrait 90×160 grid mapped
 * with `meet` so the outline keeps true human proportions on any screen. It sits
 * to the framing standard in alignment.ts: crown ~y12 (≈7%), upper-thigh cut
 * ~y146 (≈90%), body centred on x45, filling ~80-85% of the frame height. */

const CROWN_Y = 12;
const SHOULDER_Y = 44;
const HIP_Y = 105;
const THIGH_CUT_Y = 146;
const CENTER_X = 45;

/** The body silhouette paths for each angle (drawn in the 90×160 viewBox). */
function silhouette(angle: BodyProgressAngle): ReactNode {
  switch (angle) {
    case "front":
      return (
        <>
          {/* head + face cue (front shows the face) */}
          <ellipse cx={45} cy={23} rx={8} ry={10.5} />
          <g strokeWidth={0.7}>
            <path d="M40 21 Q41 20 42.5 21" fill="none" />
            <path d="M47.5 21 Q49 20 50 21" fill="none" />
            <path d="M45 22 L45 26.5 Q45 27.5 46 27.5" fill="none" />
            <path d="M42 29.5 Q45 31 48 29.5" fill="none" />
          </g>
          {/* neck + torso (shoulders → waist → hips) */}
          <path d="M41 32 L49 32 L49 38 L41 38 Z" />
          <path d="M27 45 C25 60 33 68 33 82 C33 90 31 98 30 105 L60 105 C59 98 57 90 57 82 C57 68 65 60 63 45 C54 40 36 40 27 45 Z" />
          {/* arms */}
          <path d="M28 47 C19 60 17 82 19 104 C19 108 22 109 23 105 C24 86 27 66 32 54 Z" />
          <path d="M62 47 C71 60 73 82 71 104 C71 108 68 109 67 105 C66 86 63 66 58 54 Z" />
          {/* upper thighs (cut at the framing line) */}
          <path d="M31 105 L44 105 L43 146 L33 146 Z" />
          <path d="M46 105 L59 105 L57 146 L47 146 Z" />
        </>
      );
    case "back":
      return (
        <>
          {/* head with long hair draped over shoulders (back shows no face) */}
          <ellipse cx={45} cy={23} rx={8} ry={10.5} />
          <path d="M36 15 C33 34 34 60 38 80 L52 80 C56 60 57 34 54 15 C50 10 40 10 36 15 Z" opacity={0.85} />
          {/* torso */}
          <path d="M41 32 L49 32 L49 38 L41 38 Z" />
          <path d="M27 45 C25 60 33 68 33 82 C33 90 31 98 30 105 L60 105 C59 98 57 90 57 82 C57 68 65 60 63 45 C54 40 36 40 27 45 Z" />
          {/* arms */}
          <path d="M28 47 C19 60 17 82 19 104 C19 108 22 109 23 105 C24 86 27 66 32 54 Z" />
          <path d="M62 47 C71 60 73 82 71 104 C71 108 68 109 67 105 C66 86 63 66 58 54 Z" />
          {/* upper thighs */}
          <path d="M31 105 L44 105 L43 146 L33 146 Z" />
          <path d="M46 105 L59 105 L57 146 L47 146 Z" />
        </>
      );
    case "left":
      // Profile facing left: nose to the left, hair falling behind (right).
      return (
        <>
          <ellipse cx={47} cy={22} rx={7.5} ry={10} />
          <path d="M39.5 20 L36 22.5 L39.5 25" fill="none" strokeWidth={0.8} />
          <path d="M53 14 C58 30 58 50 54 64 L59 64 C62 46 62 26 57 14 Z" opacity={0.85} />
          <path d="M46 31 L52 31 L52 38 L45 38 Z" />
          {/* profile torso: chest bulges forward (left), buttock behind (right) */}
          <path d="M46 33 C39 45 38 58 40 72 C41 84 42 94 42 105 L58 105 C60 96 61 80 60 64 C59 52 55 42 52 35 C50 32 48 32 46 33 Z" />
          {/* the single visible arm hanging in front */}
          <path d="M50 47 C46 62 45 86 46 107 C46 111 49 111 49 107 C50 86 52 64 55 50 Z" />
          {/* both legs overlap into one column in profile */}
          <path d="M42 105 L59 105 L56 146 L45 146 Z" />
        </>
      );
    case "right":
      // Profile facing right (independently drawn — the mirror of `left`).
      return (
        <>
          <ellipse cx={43} cy={22} rx={7.5} ry={10} />
          <path d="M50.5 20 L54 22.5 L50.5 25" fill="none" strokeWidth={0.8} />
          <path d="M37 14 C32 30 32 50 36 64 L31 64 C28 46 28 26 33 14 Z" opacity={0.85} />
          <path d="M44 31 L38 31 L38 38 L45 38 Z" />
          <path d="M44 33 C51 45 52 58 50 72 C49 84 48 94 48 105 L32 105 C30 96 29 80 30 64 C31 52 35 42 38 35 C40 32 42 32 44 33 Z" />
          <path d="M40 47 C44 62 45 86 44 107 C44 111 41 111 41 107 C40 86 38 64 35 50 Z" />
          <path d="M48 105 L31 105 L34 146 L45 146 Z" />
        </>
      );
  }
}

export function AlignmentOverlay({ angle, aligned }: { angle: BodyProgressAngle; aligned: boolean }) {
  const stroke = aligned ? "#34d399" : "rgba(255,255,255,0.92)";
  const fill = aligned ? "rgba(52,211,153,0.16)" : "rgba(255,255,255,0.05)";
  const lineStroke = aligned ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.45)";

  return (
    <svg
      viewBox="0 0 90 160"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* framing reference lines: centre, shoulder, hip, upper-thigh cut */}
      <g style={{ transition: "stroke 250ms ease" }} stroke={lineStroke} strokeWidth={0.4} strokeDasharray="2.5 2.5" fill="none">
        <line x1={CENTER_X} y1={4} x2={CENTER_X} y2={156} />
        <line x1={20} y1={SHOULDER_Y} x2={70} y2={SHOULDER_Y} />
        <line x1={24} y1={HIP_Y} x2={66} y2={HIP_Y} />
      </g>
      <line
        x1={8}
        y1={THIGH_CUT_Y}
        x2={82}
        y2={THIGH_CUT_Y}
        stroke={lineStroke}
        strokeWidth={0.55}
        strokeDasharray="4 2.5"
        style={{ transition: "stroke 250ms ease" }}
      />
      {/* crown reference tick */}
      <line x1={38} y1={CROWN_Y} x2={52} y2={CROWN_Y} stroke={lineStroke} strokeWidth={0.5} style={{ transition: "stroke 250ms ease" }} />

      {/* the realistic body silhouette for this angle */}
      <g
        style={{ transition: "stroke 250ms ease, fill 250ms ease" }}
        stroke={stroke}
        fill={fill}
        strokeWidth={1.1}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {silhouette(angle)}
      </g>
    </svg>
  );
}
