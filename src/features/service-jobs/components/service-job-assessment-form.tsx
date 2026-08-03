"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function ServiceJobAssessmentForm() {
  const [lines, setLines] = useState([
    {
      id: crypto.randomUUID(),
      type: "service",
      description: "",
      quantity: 1,
      unitPriceSatang: 0,
    },
  ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment lines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lines.map((line, index) => (
          <div
            className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_8rem_10rem_auto]"
            key={line.id}
          >
            <input
              aria-label={`Description ${index + 1}`}
              className="input"
              placeholder="Service or part description"
              value={line.description}
              onChange={(event) =>
                setLines((items) =>
                  items.map((item) =>
                    item.id === line.id
                      ? { ...item, description: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <select
              aria-label={`Type ${index + 1}`}
              className="input"
              value={line.type}
              onChange={(event) =>
                setLines((items) =>
                  items.map((item) =>
                    item.id === line.id
                      ? { ...item, type: event.target.value }
                      : item,
                  ),
                )
              }
            >
              <option value="service">Service</option>
              <option value="part">Part</option>
            </select>
            <input
              aria-label={`Price ${index + 1}`}
              className="input"
              min="0"
              type="number"
              value={line.unitPriceSatang / 100}
              onChange={(event) =>
                setLines((items) =>
                  items.map((item) =>
                    item.id === line.id
                      ? {
                          ...item,
                          unitPriceSatang: Math.round(
                            Number(event.target.value) * 100,
                          ),
                        }
                      : item,
                  ),
                )
              }
            />
            <Button
              onClick={() =>
                setLines((items) => items.filter((item) => item.id !== line.id))
              }
              type="button"
              variant="outline"
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            setLines((items) => [
              ...items,
              {
                id: crypto.randomUUID(),
                type: "service",
                description: "",
                quantity: 1,
                unitPriceSatang: 0,
              },
            ])
          }
          type="button"
          variant="outline"
        >
          Add line
        </Button>
      </CardContent>
    </Card>
  );
}
