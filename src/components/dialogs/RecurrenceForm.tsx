"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Recurrence } from "@/lib/types";

interface RecurrenceFormProps {
  value?: Recurrence;
  onChange: (recurrence: Recurrence | undefined) => void;
}

type EndType = "never" | "count" | "date";

export function RecurrenceForm({ value, onChange }: RecurrenceFormProps) {
  const [freq, setFreq] = useState<Recurrence["freq"]>(value?.freq ?? "weekly");
  const [interval, setInterval] = useState<number>(value?.interval ?? 1);
  const [endType, setEndType] = useState<EndType>(
    value?.count ? "count" : value?.endDate ? "date" : "never"
  );
  const [count, setCount] = useState<number>(value?.count ?? 8);
  const [endDate, setEndDate] = useState<string>(value?.endDate ?? "");

  const handleChange = useCallback(() => {
    if (endType === "never") {
      onChange({ freq, interval, count: 200 });
    } else if (endType === "count") {
      onChange({ freq, interval, count: Math.max(1, count) });
    } else {
      onChange({ freq, interval, endDate: endDate || undefined });
    }
  }, [freq, interval, endType, count, endDate, onChange]);

  return (
    <div className="space-y-3">
      {/* Frequency */}
      <div className="space-y-1.5">
        <Label className="text-xs">Frequency</Label>
        <Select
          value={freq}
          onValueChange={(v: string | null) => {
            if (v === "daily" || v === "weekly" || v === "monthly") {
              setFreq(v);
              setTimeout(handleChange, 0);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily" className="text-xs">Daily</SelectItem>
            <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
            <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interval */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Every{" "}
          <Input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => {
              setInterval(Math.max(1, parseInt(e.target.value) || 1));
              setTimeout(handleChange, 0);
            }}
            className="inline-block w-16 h-7 px-1.5 text-xs mx-1"
          />{" "}
          {freq === "daily" ? "days" : freq === "weekly" ? "weeks" : "months"}
        </Label>
      </div>

      {/* End Condition */}
      <div className="space-y-1.5">
        <Label className="text-xs">End</Label>
        <Select
          value={endType}
          onValueChange={(v: string | null) => {
            if (v) setEndType(v as EndType);
            setTimeout(handleChange, 0);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never" className="text-xs">Never</SelectItem>
            <SelectItem value="count" className="text-xs">After N occurrences</SelectItem>
            <SelectItem value="date" className="text-xs">On date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count or Date input */}
      {endType === "count" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Occurrences</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => {
              setCount(Math.max(1, parseInt(e.target.value) || 1));
              setTimeout(handleChange, 0);
            }}
            className="h-8 text-xs"
          />
        </div>
      )}
      {endType === "date" && (
        <div className="space-y-1.5">
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setTimeout(handleChange, 0);
            }}
            className="h-8 text-xs"
          />
        </div>
      )}
    </div>
  );
}
