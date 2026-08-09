"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SIZES } from "@/lib/constants";

export interface GeneratedVariant {
  size: string;
  color: string;
  colorHex: string;
}

interface VariantGeneratorProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (variants: GeneratedVariant[]) => void;
}

const DEFAULT_SIZE_OPTIONS = SIZES.slice(1, 6); // S, M, L, XL, XXL

export default function VariantGenerator({ open, onClose, onGenerate }: VariantGeneratorProps) {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [customSize, setCustomSize] = useState("");

  function toggleSize(size: string) {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  }

  function addCustomSize() {
    const trimmed = customSize.trim().toUpperCase();
    if (trimmed && !selectedSizes.includes(trimmed)) {
      setSelectedSizes((prev) => [...prev, trimmed]);
    }
    setCustomSize("");
  }

  function addColor() {
    const trimmed = colorName.trim();
    if (trimmed && !colors.some((c) => c.name === trimmed)) {
      setColors((prev) => [...prev, { name: trimmed, hex: colorHex }]);
      setColorName("");
      setColorHex("#000000");
    }
  }

  function removeColor(name: string) {
    setColors((prev) => prev.filter((c) => c.name !== name));
  }

  function handleGenerate() {
    const variants: GeneratedVariant[] = [];
    const colorList = colors.length > 0 ? colors : [{ name: "Default", hex: "#000000" }];
    const sizeList = selectedSizes.length > 0 ? selectedSizes : ["One Size"];

    for (const color of colorList) {
      for (const size of sizeList) {
        variants.push({ size, color: color.name, colorHex: color.hex });
      }
    }

    onGenerate(variants);
    setSelectedSizes([]);
    setColors([]);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Variants"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleGenerate}>Generate</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">Sizes</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SIZE_OPTIONS.map((size) => (
              <label
                key={size}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-sm dark:border-neutral-700"
              >
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size)}
                  onChange={() => toggleSize(size)}
                />
                {size}
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Custom size"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              className="w-32"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addCustomSize}>
              Add
            </Button>
          </div>
          {selectedSizes.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
              Selected: {selectedSizes.join(", ")}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">Colors</p>
          <div className="flex items-end gap-2">
            <Input
              label="Name"
              placeholder="e.g. Navy Blue"
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              className="w-40"
            />
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border border-gray-300 dark:border-neutral-700"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addColor}>
              Add color
            </Button>
          </div>
          {colors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((c) => (
                <span
                  key={c.name}
                  className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-xs dark:border-neutral-700"
                >
                  <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                  {c.name}
                  <button onClick={() => removeColor(c.name)} className="text-gray-400 hover:text-gray-700">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          This will generate {(selectedSizes.length || 1) * (colors.length || 1)} variant(s).
        </p>
      </div>
    </Modal>
  );
}
