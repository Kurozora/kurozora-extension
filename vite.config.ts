import { defineConfig } from "vite"
import webExtension, { readJsonFile } from "vite-plugin-web-extension"
import zipPack from "vite-plugin-zip-pack"

function generateManifest() {
    const manifest = readJsonFile("manifest.json")
    return {
        ...manifest,
    }
}

export default defineConfig({
    plugins: [
        webExtension({
            browser: process.env.TARGET || "firefox",
            manifest: generateManifest,
            watchFilePaths: ["package.json", "manifest.json"],
        }),
        zipPack({
            outFileName: 'Kurozora.zip'
        })
    ],
})
