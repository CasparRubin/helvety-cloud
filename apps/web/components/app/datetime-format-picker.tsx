"use client";

import { CalendarClockIcon } from "lucide-react";

import { useDateTimePrefs } from "@/components/app/datetime-prefs";
import { DateTimeText } from "@/components/app/datetime-text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DATETIME_PRESETS } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

export function DatetimeFormatPicker() {
  const { prefs, setPrefs } = useDateTimePrefs();
  const previewIso = new Date().toISOString();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Date and time format"
          />
        }
      >
        <CalendarClockIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-2 p-2" align="end">
        <PopoverHeader className="px-1">
          <PopoverTitle>Date & time format</PopoverTitle>
        </PopoverHeader>
        <ul className="flex flex-col gap-0.5">
          {DATETIME_PRESETS.map((preset) => {
            const selected = prefs.preset === preset.id;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted",
                    selected && "bg-muted",
                  )}
                  aria-pressed={selected}
                  onClick={() => setPrefs({ ...prefs, preset: preset.id })}
                >
                  <span className="text-sm font-medium">{preset.label}</span>
                  <DateTimeText
                    className="truncate text-[11px] text-muted-foreground"
                    value={previewIso}
                    prefs={{
                      preset: preset.id,
                      relative: prefs.relative,
                    }}
                  />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2 border-t px-1 pt-2">
          <Checkbox
            id="datetime-relative"
            checked={prefs.relative}
            onCheckedChange={(value) =>
              setPrefs({ ...prefs, relative: value === true })
            }
          />
          <Label htmlFor="datetime-relative" className="font-normal">
            Show relative time
          </Label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
