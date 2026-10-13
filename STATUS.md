# STATUS.md — สถานะโปรเจกต์ Merchant Calculator PWA (`zero`)

> อัปเดตล่าสุด: 2026-10-13 · โดย: opencode session (เจ้าของ/ผู้พัฒนาเอง) · หลักฐานนี้ใช้ส่งต่อทีมรอบถัดไป

---

## 1. ภาพรวมโปรเจกต์

Merchant Calculator PWA — เครื่องคิดเงินสำหรับพ่อค้าแม่ค้าไทย ทำงาน offline ได้ ไม่มี framework/build tool/dependency

- Core logic (pure JS ไม่แตะ DOM): `js/core/calc.js` (148 บรรทัด), `js/core/tools.js` (95 บรรทัด)
- UI wiring แยก 3 ไฟล์: `js/app.js` (150), `js/ui.js` (53), `js/tape.js` (48) — ทุกไฟล์ ≤ 200 บรรทัด
- i18n: `js/i18n/` th/en — **50 คีย์เท่ากันครบ**, `data-i18n` ใน HTML 45 จุดครบทั้งสองภาษา
- PWA: `manifest.json`, `sw.js` (`CACHE='merchant-calc-v3'`, cache-first), ไอคอน generate จริง 192/512
- static server เสิร์ฟ 14/14 asset ตอบ 200 (index, css, 5 js, 3 i18n, manifest, sw, 2 ไอคอน)

## 2. หลักฐานผลทดสอบ (2026-10-13)

- `node --test` → **30/30 pass** (เดิม 17 → เพิ่ม 13 รอบนี้)
  - core: float noise, ÷0, syntax, VAT, margin/fee, cash/change, percent, formatMoney
  - ใหม่: `%` ในสมการ, `round2` ค่าใหญ่/เล็ก, discount clamp ที่ 0
  - **ใหม่: `js/app.test.js` (10 เทสต์)** — DOM stub ตรวจ wiring จริงของทุกแท็บ, error แสดงครบทุกช่อง, quick-cash, persistence ของ tape/lang, สลับภาษา
- `node scripts/verify.mjs` → **all checks passed (6/6)** — ดูหัวข้อ 3
- HTTP smoke test → 14/14 assets 200

## 3. Workflow อัตโนมัติ (สร้างรอบนี้)

| คำสั่ง | ตรวจอะไร |
|---|---|
| `node --test` | unit + UI wiring tests |
| `node scripts/verify.mjs` | gate รวม 6 ข้อ: tests · i18n parity · data-i18n coverage · ขนาดไฟล์ ≤200 · import graph · PWA assets+ไอคอน ≥2KB |
| `node scripts/gen-icons.mjs` | generate ไอคอน PNG ใหม่ (ไม่มี dependency) |

- ไอคอนเดิมเป็น placeholder (587B/2.2KB) → **แทนที่แล้ว** ด้วยไอคอน generate (4KB/26KB) หน้าตา: พื้นดำมุมโค้ง + จอ + ตารางปุ่ม 3×3 มีปุ่มเขียว (เทสต์ผ่าน `≥2KB` ใน verify)
- แก้ asset ไฟล์ใด → bump `CACHE` ใน `sw.js` ทุกครั้ง (ตอนนี้ v3)

## 4. งานที่ทำแล้วเสร็จรอบนี้ (ปิด backlog ข้อ 1–6, 9, 11)

| # | งาน | สถานะ |
|---|---|---|
| 1 | `%` ในสมการ: `100-15%`→85, `500*15%`→75, `15%`→0.15, `100-15%-10%`→76.5 | ✅ |
| 2 | `discountCash` คลamping ที่ 0 (`100-150`→0 ไม่ใช่ -50) | ✅ |
| 3 | `round2(1e21)`→`1e21` ไม่เพี้ยน, `round2(1e-9)`→0 | ✅ |
| 4 | Pricing error แสดงครบทุกช่อง (5/5) + คีย์ `error.BAD_NUMBER`/`BAD_PERCENT` th/en | ✅ |
| 5 | แยก `app.js` 237→150 บรรทัด (แยก `ui.js`, `tape.js`) | ✅ |
| 6 | ไอคอน placeholder → generate จริง | ✅ (ออกแบบใหม่ได้ภายหลัง) |
| 9 | bump `CACHE` (v1→v3) | ✅ |
| 10 | สร้างไฟล์ agent `coder`/`tester`/`reviewer` | ❌ ยังไม่ทำ (ผู้ใช้+lead-dev) |
| 11 | `lead-dev.md:55` สำรอง → `gemini-3.5-flash-lite` | ✅ |
| + | เพิ่ม `<noscript>`, เพิ่ม gate `scripts/verify.mjs`, เพิ่ม `js/app.test.js` | ✅ |

## 5. งานค้าง (เหลือจากเดิม)

| # | งาน | ผู้รับผิดชอบ | สถานะ |
|---|---|---|---|
| 7 | พิสูจน์จริงในเบราว์เซอร์: offline reload (DevTools→offline→refresh), สลับภาษาหลัง reload, persistence ของ tape | tester/ผู้ใช้ | ❌ ยังไม่ได้พิสูจน์ (เทสต์ level ผ่านแล้วใน `js/app.test.js`) |
| 8 | init git | ผู้ใช้ | ❌ ยังไม่ทำ (ไม่ commit โดยไม่ได้รับคำสั่ง) |
| 10 | สร้างไฟล์ agent `coder`/`tester`/`reviewer` พร้อมโมเดลปัจจุบัน | ผู้ใช้+lead-dev | ❌ |
| 12 | พิสูจน์กลไก "ความจำ"/โทเคน ของโมเดลผ่าน bridge (หัวข้อ 6) | tester | ❌ |
| - | ไอคอนเวอร์ชันออกแบบจริง (ถ้าไม่ชอบแบบ generate) | ผู้ใช้ | เสนอ |

## 6. ทีม AI Agent + LLM Bridge (คงเดิมจาก 2026-10-08)

- มีไฟล์ agent จริงแค่ **`lead-dev`** (`.opencode/agent/lead-dev.md`) — `coder`/`tester`/`reviewer` ยังไม่มีไฟล์
- provider `aipass` นิยามที่ **`C:\Users\COM\.config\opencode\opencode.jsonc`** (global) · โมเดลฟรีเหลือ `gemini-3.5-flash-lite` · ต้องรีสตาร์ต opencode ทุกครั้งที่แก้ config/agent/สกิล
- สกิล: `C:\Users\COM\.config\opencode\skills\aipass-bridge\SKILL.md` (global)
- ห้ามแก้ไฟล์ใน `D:\projects\aipass-bridge` โดยไม่ได้รับอนุมัติ

## 7. ปัญหาเปิดรอพิสูจน์ (บันทึกไว้จาก 2026-10-08 — ยังไม่ปิด)

- **P-1**: "ความจำข้ามเทิร์น/ข้ามโมเดล" = history ที่แนบไปทุกเทิร์น หรือโมเดลจำจริง? วิธีพิสูจน์: วัด prompt_tokens non-streaming (แชทใหม่ vs คุย 10 เทิร์น), ทดสอบลืมเมื่อ history ยาว, cross-model secret phrase · ข้อจำกัด: bridge ไม่มี token จริง — ห้ามอ้างเป็นค่า billing

## 8. ข้อควรจำ

- `skip` ไม่ใช่ผ่าน — ต้องรันจริงถึงจะรายงานผ่าน
- clipboard copy ไม่ทำงานบน `file://`/http ที่ไม่ใช่ secure context
- ทุกข้อความผ่าน bridge จะปรากฏในประวัติ de.aipass.net จริง
- เทสต์ UI (`js/app.test.js`) ล็อกภาษาเป็น `en` ผ่าน `localStorage` ก่อน import — ห้ามพึ่ง locale ของเครื่อง
