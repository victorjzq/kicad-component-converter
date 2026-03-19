import { test, expect } from "bun:test"
import { parseKicadModToCircuitJson } from "src"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import fs from "fs"
import { join } from "path"

test("oval pads: thru-hole oval becomes pill-shaped pcb_plated_hole", async () => {
  const fileContent = `
(module OvalPadThroughHole (layer F.Cu)
  (pad 1 thru_hole oval (at 0 0) (size 1 1.6) (drill oval 0.6 1.2) (layers *.Cu *.Mask))
)`.trim()

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const holes = circuitJson.filter((el: any) => el.type === "pcb_plated_hole")

  expect(holes).toHaveLength(1)
  const hole = holes[0] as any
  expect(hole.shape).toBe("pill")
  expect(hole.outer_width).toBe(1)
  expect(hole.outer_height).toBe(1.6)
  expect(hole.hole_width).toBe(0.6)
  expect(hole.hole_height).toBe(1.2)
})

test("oval pads: thru-hole oval with 90deg rotation swaps dimensions", async () => {
  const fileContent = `
(module OvalPadRotated (layer F.Cu)
  (pad 1 thru_hole oval (at 0 0 90) (size 1 1.6) (drill oval 0.6 1.2) (layers *.Cu *.Mask))
)`.trim()

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const holes = circuitJson.filter((el: any) => el.type === "pcb_plated_hole")

  expect(holes).toHaveLength(1)
  const hole = holes[0] as any
  expect(hole.shape).toBe("pill")
  // At 90deg, width/height swap
  expect(hole.outer_width).toBe(1.6)
  expect(hole.outer_height).toBe(1)
  expect(hole.hole_width).toBe(1.2)
  expect(hole.hole_height).toBe(0.6)
})

test("oval pads: smd oval pad becomes pill-shaped pcb_smtpad", async () => {
  const fileContent = `
(module OvalSMDPad (layer F.Cu)
  (pad 1 smd oval (at 0 0) (size 1.2 0.8) (layers F.Cu F.Paste F.Mask))
)`.trim()

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const smtpads = circuitJson.filter((el: any) => el.type === "pcb_smtpad")

  expect(smtpads).toHaveLength(1)
  const pad = smtpads[0] as any
  expect(pad.shape).toBe("pill")
  expect(pad.width).toBe(1.2)
  expect(pad.height).toBe(0.8)
  // radius = min(width, height) / 2
  expect(pad.radius).toBe(0.4)
})

test("oval pads: smd circle pad becomes circle-shaped pcb_smtpad", async () => {
  const fileContent = `
(module CircleSMDPad (layer F.Cu)
  (pad 1 smd circle (at 0 0) (size 1 1) (layers F.Cu F.Paste F.Mask))
)`.trim()

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const smtpads = circuitJson.filter((el: any) => el.type === "pcb_smtpad")

  expect(smtpads).toHaveLength(1)
  const pad = smtpads[0] as any
  expect(pad.shape).toBe("circle")
  expect(pad.radius).toBe(0.5)
})

test("oval pads: SVG snapshot of USB-C oval through-holes", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "fixtures/kicad-footprints/Connector_USB.pretty/USB_C_Receptacle_CNCTech_C-ARA1-AK51X.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf8")

  const circuitJson = await parseKicadModToCircuitJson(fileContent)

  // All four oval through-hole pads must be pill-shaped
  const ovalHoles = circuitJson.filter(
    (el: any) => el.type === "pcb_plated_hole" && el.shape === "pill",
  )
  expect(ovalHoles.length).toBeGreaterThanOrEqual(4)

  expect(convertCircuitJsonToPcbSvg(circuitJson as any)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
