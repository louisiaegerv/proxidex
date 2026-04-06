# Image Storage Strategy for Pokémon TCG Cards

**Date:** March 31, 2026  
**Status:** Final Design  
**Goal:** Define image storage structure using existing organized files.

---

## Current File Structure (Keep As-Is)

Your existing organization is well-designed and requires no changes:

```
C:\Users\louis\Coding\pokemon-card-images\
├── Pokémon_151_MEW/
│   ├── Abra_MEW_063_sm.webp
│   ├── Abra_MEW_063_md.webp
│   ├── Abra_MEW_063_lg.webp
│   ├── Abra_MEW_063_xl.webp
│   ├── Mewtwo_MEW_150_sm.webp
│   └── ...
├── Base_Set_BS/
│   ├── Alakazam_BS_1_sm.webp
│   ├── Alakazam_BS_1_md.webp
│   └── ...
├── Obsidian_Flames_OBF/
│   ├── Charmander_OBF_026_sm.webp
│   ├── Charmander_OBF_026_holo_sm.webp
│   └── ...
└── Scarlet_Violet_SV/
    └── ...
```

### File Naming Convention

```
{CardName}_{SetCode}_{LocalId}_{Variant?}_{Size}.webp

Examples:
- Abra_MEW_063_sm.webp           (normal variant)
- Abra_MEW_063_holo_sm.webp      (holo variant)
- Abra_MEW_063_reverse_sm.webp   (reverse variant)
```

| Component | Description | Example |
|-----------|-------------|---------|
| `CardName` | Card name with underscores | `Abra`, `Mewtwo`, `Charizard_ex` |
| `SetCode` | Official set abbreviation | `MEW`, `BS`, `OBF`, `SV` |
| `LocalId` | Card number in set | `063`, `1`, `026` |
| `Variant` | Optional: `holo`, `reverse` | (omit for normal) |
| `Size` | Image size: `sm`, `md`, `lg`, `xl` | `sm` = 288x400 |

---

## Storage Location

### Development (Local)
```
C:\Users\louis\Coding\pokemon-card-images\
```

### Production (R2)
```
https://cards.yourdomain.com/
├── Pokémon_151_MEW/
├── Base_Set_BS/
└── ... (same structure)
```

**Same file structure in both environments** - only the base URL changes.

---

## Environment Configuration

```env
# .env.local (Development)
IMAGE_SOURCE=local
LOCAL_IMAGES_PATH=C:\Users\louis\Coding\pokemon-card-images

# .env.production (Production)
IMAGE_SOURCE=r2
R2_PUBLIC_URL=https://cards.yourdomain.com
```

---

## URL Generation

```typescript
// lib/images.ts

const SET_TO_FOLDER: Record<string, string> = {
  "MEW": "Pokémon_151_MEW",
  "BS": "Base_Set_BS",
  "BS2": "Jungle_BS2",
  "OBF": "Obsidian_Flames_OBF",
  "SV": "Scarlet_Violet_SV",
  // ... all your sets
};

function getImageUrl(
  cardName: string,
  setCode: string,
  localId: string,
  size: 'sm' | 'md' | 'lg' | 'xl',
  variant: 'normal' | 'holo' | 'reverse' = 'normal'
): string {
  const folder = SET_TO_FOLDER[setCode];
  if (!folder) {
    // Fallback: use setCode directly
    return getFallbackUrl(setCode, localId, size);
  }
  
  const safeName = cardName.replace(/[^a-zA-Z0-9]/g, '_');
  const variantSuffix = variant === 'normal' ? '' : `_${variant}`;
  const fileName = `${safeName}_${setCode}_${localId}${variantSuffix}_${size}.webp`;
  
  if (process.env.IMAGE_SOURCE === 'r2') {
    return `${process.env.R2_PUBLIC_URL}/${folder}/${fileName}`;
  }
  
  // Local development
  return `/api/images/${folder}/${fileName}`;
}
```

---

## Local Development Image Serving

Simple API route for local files:

```typescript
// app/api/images/[...path]/route.ts
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(
    process.env.LOCAL_IMAGES_PATH!,
    ...params.path
  );
  
  // Security: ensure path is within base directory
  const resolvedPath = path.resolve(filePath);
  const basePath = path.resolve(process.env.LOCAL_IMAGES_PATH!);
  
  if (!resolvedPath.startsWith(basePath)) {
    return new Response('Invalid path', { status: 403 });
  }
  
  try {
    const file = await readFile(resolvedPath);
    return new Response(file, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
```

---

## Summary

| Decision | Current Design |
|----------|----------------|
| **Folder structure** | Keep as-is: `{SetName}_{SetCode}/` |
| **Filenames** | Keep as-is: `{Name}_{Code}_{Id}_{Variant?}_{Size}.webp` |
| **Storage location** | `C:\Users\louis\Coding\pokemon-card-images` |
| **Serving (local)** | `/api/images/{folder}/{filename}` |
| **Serving (R2)** | `{R2_URL}/{folder}/{filename}` |
| **Set mapping** | JSON/TS file: official code → folder name |

**No file renaming or reorganization required.**
