"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValueCombobox } from "@/components/devices/value-combobox";
import type { DeviceMasterData } from "@/lib/device-master";

export function DevicePicker({
  masterData,
  defaultDeviceType,
  defaultBrand,
  defaultModel,
  errors,
}: {
  masterData: DeviceMasterData;
  defaultDeviceType?: string;
  defaultBrand?: string;
  defaultModel?: string;
  errors?: {
    deviceType?: string[];
    brand?: string[];
    model?: string[];
  };
}) {
  const [deviceTypeName, setDeviceTypeName] = useState(defaultDeviceType ?? "");
  const [brandName, setBrandName] = useState(defaultBrand ?? "");
  const [modelName, setModelName] = useState(defaultModel ?? "");

  // Track the previous device type / brand so we can clear downstream
  // selections when the user changes them — but not on initial mount, since
  // that would wipe out pre-filled values on the edit form. Adjusting state
  // during render (rather than in a useEffect) keeps this safe under
  // React Strict Mode's double effect invocation in development.
  const [prevDeviceTypeName, setPrevDeviceTypeName] = useState(deviceTypeName);
  const [prevBrandName, setPrevBrandName] = useState(brandName);

  if (deviceTypeName !== prevDeviceTypeName) {
    setPrevDeviceTypeName(deviceTypeName);
    setPrevBrandName("");
    setBrandName("");
    setModelName("");
  } else if (brandName !== prevBrandName) {
    setPrevBrandName(brandName);
    setModelName("");
  }

  const selectedDeviceType = masterData.deviceTypes.find(
    (t) => t.name.toLowerCase() === deviceTypeName.trim().toLowerCase()
  );
  const selectedBrand = masterData.brands.find(
    (b) => b.name.toLowerCase() === brandName.trim().toLowerCase()
  );

  const brandOptions = useMemo(() => {
    const list = selectedDeviceType
      ? masterData.brands.filter((b) => b.deviceTypeIds.includes(selectedDeviceType.id))
      : masterData.brands;
    return list.map((b) => b.name);
  }, [masterData.brands, selectedDeviceType]);

  const modelOptions = useMemo(() => {
    if (!selectedBrand) return [];
    return masterData.models
      .filter(
        (m) =>
          m.brandId === selectedBrand.id &&
          (!selectedDeviceType || m.deviceTypeId === selectedDeviceType.id)
      )
      .map((m) => m.name);
  }, [masterData.models, selectedBrand, selectedDeviceType]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="deviceType">Device Type *</Label>
        <Select
          name="deviceType"
          value={deviceTypeName || undefined}
          onValueChange={(value) => setDeviceTypeName(value)}
        >
          <SelectTrigger id="deviceType" className="w-full">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {masterData.deviceTypes.map((t) => (
              <SelectItem key={t.id} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.deviceType && (
          <p className="text-xs text-destructive">{errors.deviceType[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand">Brand</Label>
        <ValueCombobox
          name="brand"
          value={brandName}
          onChange={setBrandName}
          options={brandOptions}
          placeholder="Select or type brand..."
          searchPlaceholder="Search brand..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <ValueCombobox
          name="model"
          value={modelName}
          onChange={setModelName}
          options={modelOptions}
          placeholder={selectedBrand ? "Select or type model..." : "Pick a brand first..."}
          searchPlaceholder="Search model..."
        />
      </div>
    </div>
  );
}
