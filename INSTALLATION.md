# Pro Caption AE Installation Guide

## System Requirements
- **Adobe After Effects**: 2024 or later (v24.0+)
- **Operating System**: Windows or macOS
- **Memory**: 2GB RAM minimum
- **Disk Space**: 500MB for extension + dependencies

## Installation Methods

### Method 1: Drag & Drop Installation (Recommended - Easiest)
This is the simplest way to install Pro Caption AE directly into After Effects.

1. **Download** the `.zxp` file from [GitHub Releases](https://github.com/64r3al/Pro-Caption-AE/releases)
2. **Locate** your After Effects installation folder:
   - **Windows**: `C:\Program Files\Adobe\Adobe After Effects [VERSION]\`
   - **macOS**: `/Applications/Adobe After Effects [VERSION]/`
3. **Drag** the `.zxp` file into the After Effects window
4. **Accept** the installation prompt
5. **Restart** After Effects
6. Go to **Window → Extensions → Pro Caption AE** to open the panel

### Method 2: Adobe Extension Manager (Alternative)

**Windows:**
1. Download and install [Adobe Extension Manager](https://exchange.adobe.com/extensionmanager/)
2. Open Extension Manager
3. Click **Install Extension**
4. Navigate to the `.zxp` file you downloaded
5. Click **Install**
6. Restart After Effects

**macOS:**
1. Install via Homebrew: `brew install adobe-extension-manager`
2. Or download from [Adobe Exchange](https://exchange.adobe.com/)
3. Follow the same steps as Windows above

### Method 3: Manual Installation (Advanced)

**Windows:**
```bash
# Copy the ZXP to After Effects extensions folder
xcopy "Pro-Caption-AE_1.0.0.zxp" "C:\Program Files\Adobe\Adobe After Effects [VERSION]\Support Files\Extensions\"
```

**macOS:**
```bash
# Copy the ZXP to After Effects extensions folder
cp "Pro-Caption-AE_1.0.0.zxp" "/Applications/Adobe After Effects [VERSION]/Contents/Resources/Extensions/"
```

Then restart After Effects.

## First-Time Setup

After installation, you'll need to configure your Groq API key:

1. **Open** Pro Caption AE from `Window → Extensions → Pro Caption AE`
2. **Click** the Settings icon (⚙️) in the top right
3. **Paste** your [Groq API key](https://console.groq.com/)
4. **Save** your settings
5. **Start** transcribing!

## Troubleshooting

### Extension doesn't appear after installation
- ✓ Restart After Effects completely
- ✓ Check your After Effects version is 2024 or later
- ✓ Ensure the `.zxp` file is not corrupted

### "Extension not signed" error
- This is normal for development versions
- Click "Install anyway" or add to trusted extensions
- Production releases are properly signed

### Transcription not working
- ✓ Verify your Groq API key is valid
- ✓ Check your internet connection
- ✓ Ensure you have sufficient API credits

### Still having issues?
- [Open an issue](https://github.com/64r3al/Pro-Caption-AE/issues)
- Include your OS, After Effects version, and error message

## Uninstallation

**Windows:**
1. Go to `C:\Program Files\Adobe\Adobe After Effects [VERSION]\Support Files\Extensions\`
2. Delete the `pro-caption-ae` folder
3. Restart After Effects

**macOS:**
1. Go to `/Applications/Adobe After Effects [VERSION]/Contents/Resources/Extensions/`
2. Delete the `pro-caption-ae` folder
3. Restart After Effects

## What Gets Installed

- ✓ Main Pro Caption AE extension panel
- ✓ Transcription engine (powered by Groq)
- ✓ 65+ animation presets
- ✓ Configuration and settings storage
- ✓ Support libraries and dependencies

**Installation size**: ~150-200MB (including After Effects compatibility files)

## Auto-Updates

Pro Caption AE checks for updates on startup. When a new version is available:
1. A notification appears in the panel
2. Click "Update Now" to download the latest version
3. Follow the installation steps above with the new `.zxp` file

## Getting Help

- **Documentation**: Check the [GitHub Wiki](https://github.com/64r3al/Pro-Caption-AE/wiki)
- **Issues**: [Report a bug](https://github.com/64r3al/Pro-Caption-AE/issues)
- **Discussions**: [Join the community](https://github.com/64r3al/Pro-Caption-AE/discussions)

---

**Version**: 1.0.0  
**Last Updated**: September 27, 2026
