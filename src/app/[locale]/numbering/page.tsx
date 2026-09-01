"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ContainerSize, FaceCount } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Accent per face family: side panels (orange), plywood (tan), cross members (teal).
// Keyed by IICL TB-002 location code (left/right side, interior floor, understructure).
const FACE_COLOR: Record<string, string> = {
  LXXX: "#e8622a",
  RXXX: "#e8622a",
  IXXX: "#b7863f",
  UXXX: "#3f7180",
};
const DEFAULT_COLOR = "#5b6b74";

/**
 * A single face rendered as an ordered row of numbered cells — a corrugated side
 * (LXXX/RXXX), the plywood deck (IXXX), or the cross-member row (UXXX). The door end
 * is drawn on the right; numbering runs from the door end unless flipped.
 */
function FaceRow({
  face,
  color,
  startFront,
}: {
  face: FaceCount;
  color: string;
  startFront: boolean;
}) {
  const n = Math.max(1, face.max);
  const W = 800;
  const H = 96;
  const padX = 58;
  const top = 20;
  const rowH = H - top - 30;
  const inner = W - padX * 2;
  const seg = inner / n;

  const cells = Array.from({ length: n }, (_, i) => {
    const x = padX + i * seg;
    const num = startFront ? i + 1 : n - i;
    const cx = x + seg / 2;
    const r = Math.min(14, seg * 0.4, rowH * 0.4);
    return (
      <g key={i}>
        <rect
          x={x + 1.5}
          y={top}
          width={seg - 3}
          height={rowH}
          rx={3}
          fill={color}
          fillOpacity={0.14}
          stroke={color}
          strokeWidth={1.2}
        />
        <circle cx={cx} cy={top + rowH / 2} r={r} fill={color} />
        <text
          x={cx}
          y={top + rowH / 2 + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={r > 11 ? 13 : 11}
          fontWeight={700}
          fontFamily="ui-monospace, monospace"
          fill="#fff"
        >
          {num}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${face.label} numbering`}>
      <text x={padX} y={13} fontSize={11} fontFamily="ui-monospace, monospace" fill="currentColor" opacity={0.55}>
        FRONT
      </text>
      <text x={W - padX} y={13} textAnchor="end" fontSize={11} fontFamily="ui-monospace, monospace" fill="currentColor" opacity={0.55}>
        DOOR
      </text>
      {cells}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fontFamily="ui-monospace, monospace" fill="currentColor" opacity={0.55}>
        {face.code}-1 … {face.code}-{n}
      </text>
    </svg>
  );
}

export default function NumberingPage() {
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const [size, setSize] = useState<ContainerSize>("40");
  const [startFront, setStartFront] = useState(false);

  const faces = useMemo(() => refs?.faceCounts?.[size] ?? [], [refs, size]);

  if (!refs) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel &amp; Plywood Numbering</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Side panels run as a left and right series, the plywood floor as a run
          of boards, and the understructure as a row of cross members — each
          numbered in order along the length. Use these numbers in the{" "}
          <span className="font-medium">Panel / board / member no.</span> field on
          a report; they render as <span className="font-mono">LXXX-3</span>,{" "}
          <span className="font-mono">IXXX-5</span>,{" "}
          <span className="font-mono">UXXX-4</span> on the EOR.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Container size</Label>
          <Select value={size} onValueChange={(v) => setSize(v as ContainerSize)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {refs.containerSizes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}′
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Number from</Label>
          <Select
            value={startFront ? "front" : "door"}
            onValueChange={(v) => setStartFront(v === "front")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="door">Door end (rear)</SelectItem>
              <SelectItem value="front">Front end</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {faces.map((face) => (
          <Card key={face.code}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className="inline-block size-3 rounded-sm"
                  style={{ background: FACE_COLOR[face.code] ?? DEFAULT_COLOR }}
                />
                {face.label}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {face.max} × {face.code}
              </span>
            </CardHeader>
            <CardContent>
              <FaceRow
                face={face}
                color={FACE_COLOR[face.code] ?? DEFAULT_COLOR}
                startFront={startFront}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">On the report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-mono font-semibold text-foreground">LXXX-3</span>{" "}
            = component PAA · location LXXX · panel 3.{" "}
            <span className="font-mono font-semibold text-foreground">IXXX-5</span>{" "}
            = component FPP · location IXXX · board 5.{" "}
            <span className="font-mono font-semibold text-foreground">UXXX-4</span>{" "}
            = component CMA · location UXXX · member 4.
          </p>
          <p className="rounded-md border-l-2 border-primary bg-muted/40 px-3 py-2">
            Counts are practical depot defaults — sheet size, board count and
            cross-member count vary by builder and series. Confirm against your
            actual units and adjust the seeded standards if they differ.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
