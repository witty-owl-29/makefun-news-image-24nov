// Entry point for the news-image-20261124 submission.
//
// "THE 24TH" — a one-page newspaper front page summing up Tuesday
// 24 November 2026 in a single image. The finished page lives in this
// repo as entry.png (drawn as HTML/CSS/SVG in this session and rendered
// to a 1024x1024 PNG with a headless browser). This script copies it,
// byte for byte, into the output directory the grader reads
// (MAKEFUN_OUTPUT_DIR, default /output). No network, no randomness:
// running it twice produces the identical file.
//
// The page: masthead "THE 24TH" with a 24-hour clock dial plotting the
// day's key events at their UTC times; a "THE DAY IN UTC" timeline;
// hero "HUANG'S SECOND ACT" (Nvidia, +37%); leads on Zelensky's
// four-way talks call and NATO's space-defence vow; a numbers strip;
// twelve picture stories; a schematic world map with pins; thirty
// briefs; and a DATE CHECK footer naming what was deliberately left
// out (Shenzhen trilateral and ICJ Myanmar ruling: 19 Nov; Nvidia
// reinstatement announced 23 Nov; EU sanctions proposed 23 Nov;
// Inter's thriller: October).
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;

// Reads width/height from a PNG (IHDR) or JPEG (first SOF marker) buffer.
// Returns null when the bytes are neither format. The PNG check uses the
// full 8-byte signature; the JPEG check also requires the EOI marker,
// so a truncated file is rejected instead of passing as valid.
function dimensions(buf: Buffer): { width: number; height: number } | null {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length > 24 && buf.subarray(0, 8).equals(PNG_SIG)) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) {
      return null; // truncated JPEG: no end-of-image marker
    }
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    }
  }
  return null;
}

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "entry.png");
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
const target = join(outDir, "entry.png");

if (!existsSync(source)) {
  console.error(`missing image: ${source}`);
  process.exit(1);
}

const bytes = readFileSync(source);
if (bytes.length > MAX_BYTES) {
  console.error(`image too large: ${bytes.length} bytes (limit ${MAX_BYTES})`);
  process.exit(1);
}
const size = dimensions(bytes);
if (size === null) {
  console.error("image is neither PNG nor JPEG");
  process.exit(1);
}
if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
  console.error(`image too big: ${size.width}x${size.height} (limit ${MAX_SIDE}x${MAX_SIDE})`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);

// Post-copy check: the file the grader reads must be byte-identical to
// the source and still a valid image, so a partial write can never pass.
const copied = readFileSync(target);
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");
if (digest(copied) !== digest(bytes)) {
  console.error("copy mismatch: output bytes differ from source");
  process.exit(1);
}
const copiedSize = dimensions(copied);
if (copiedSize === null || copiedSize.width !== size.width || copiedSize.height !== size.height) {
  console.error("copy mismatch: output dimensions differ from source");
  process.exit(1);
}
console.log(`copied ${bytes.length} bytes (${size.width}x${size.height}) to ${target} (sha256 ${digest(bytes).slice(0, 12)}…)`);
