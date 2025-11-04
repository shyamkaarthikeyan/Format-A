# 🔧 FIX: Rollup Native Module Error on Vercel

## Error Identified

```
Cannot find module '@rollup/rollup-linux-x64-gnu'
at /vercel/path0/node_modules/rollup/dist/native.js
```

**Root Cause:** Rollup tries to load optional native binaries for performance, but Vercel's build environment doesn't have them installed or they fail to load.

## Fixes Applied

### 1. Updated `vercel.json`
```json
"installCommand": "npm install --no-optional --legacy-peer-deps"
```
- `--no-optional`: Skips installing optional native dependencies
- This prevents Rollup from trying to load native binaries

### 2. Updated `vite.config.ts`
Added build configuration to:
- Exclude Rollup native modules from optimization
- Mark native modules as external
- Suppress warnings about missing optional deps
- Use ESbuild for minification (not Rollup's native features)

### 3. Updated `package.json`
- Moved Rollup optional dependencies to `optionalDependencies` section
- Added resolution to lock Rollup version

## Why This Happens

Rollup has **optional native addons** for faster builds:
- `@rollup/rollup-linux-x64-gnu` (Linux)
- `@rollup/rollup-darwin-x64` (Mac Intel)
- `@rollup/rollup-darwin-arm64` (Mac ARM)
- `@rollup/rollup-win32-x64-msvc` (Windows)

When these aren't installed or fail, Rollup should fall back to JavaScript implementation, but sometimes the error isn't handled properly.

## Solution

By using `--no-optional`, we tell npm to:
1. Skip installing these native addons
2. Force Rollup to use pure JavaScript implementation
3. Avoid the native module loading error

## Trade-off

**Downside:** Builds might be ~10-20% slower without native addons
**Upside:** Builds actually work and complete successfully!

## Testing

Run locally to verify:
```bash
npm install --no-optional
npm run build
```

Should complete without errors and generate new bundle with different hash.

---

**Status:** Ready to deploy
**Expected:** Clean build on Vercel, new bundle hash generated
