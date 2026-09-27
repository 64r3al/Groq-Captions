# First-Time Setup Instructions

## Welcome to Pro Caption AE! 🎉

This guide will walk you through the one-time setup needed to start creating captions.

## What You Need

Before getting started, have these ready:

1. **After Effects 2024+** (installed and ready)
2. **The Pro Caption AE `.zxp` file** (downloaded from GitHub Releases)
3. **A Groq API Key** (free - takes 2 minutes to get)

## Installation Steps

### Step 1: Install the Extension

**Easiest Method - Drag & Drop:**
1. Download the `.zxp` file from [GitHub Releases](https://github.com/64r3al/Pro-Caption-AE/releases)
2. Open After Effects
3. Drag the `.zxp` file into the After Effects window
4. Click "Install" when prompted
5. Restart After Effects

**Alternative - Extension Manager:**
1. Install [Adobe Extension Manager](https://exchange.adobe.com/extensionmanager/)
2. Open Extension Manager
3. Click "Install" and select the `.zxp` file
4. Restart After Effects

### Step 2: Get Your API Key

Pro Caption AE uses the Groq API for transcription. Getting an API key is **free**:

1. Go to [Groq Console](https://console.groq.com/)
2. Click **"Sign Up"**
   - You can use email, Google, or GitHub
3. **Verify** your email address
4. Go to **"API Keys"** in the left sidebar
5. Click **"Create New API Key"**
6. Copy the key to your clipboard
7. **Save it somewhere safe** (you'll paste it next)

### Step 3: Configure Your API Key

1. Open After Effects
2. Go to **Window → Extensions → Pro Caption AE**
3. The panel will open on the right side
4. Click the **⚙️ Settings icon** (top right of the panel)
5. A settings dialog will appear
6. In the **API Key** field, paste your Groq API key
7. Click **Save**

Done! ✅ You're ready to create captions.

## Your First Caption

### Create Your First Captions:

1. **Open a composition** with audio in After Effects
2. In the Pro Caption AE panel, click **"Select Audio"**
3. Choose the audio layer from the dropdown
4. Click **"Transcribe"**
5. Wait for the transcription to complete
   - This may take a minute or two depending on your audio length
6. Review the transcription:
   - Check that words are spelled correctly
   - Use the **Glossary** to add proper nouns if needed
   - Adjust any timing issues
7. **Choose an animation style** from the presets
   - Preview in real-time on the canvas
   - Adjust colors and fonts if desired
8. Click **"Build Captions"**
9. Pro Caption AE will create animated text layers in your composition

### See Your Results:
- New text layers will appear in your timeline
- Each word has keyframed animations
- You can adjust them just like normal After Effects layers
- Everything is fully editable!

---

## Next Steps

### Learn More:
- 📖 [Full Installation Guide](./INSTALLATION.md) - Troubleshooting & advanced options
- ⚡ [Quick Start Guide](./QUICK_START.md) - Tips and tricks
- 🏗️ [Architecture Docs](./docs/ARCHITECTURE.md) - How everything works

### Get Comfortable:
- Try different animation styles
- Experiment with the glossary feature
- Test with different audio types
- Explore caption customization

### Need Help?
- 💬 [Community Discussions](https://github.com/64r3al/Pro-Caption-AE/discussions)
- 🐛 [Report Issues](https://github.com/64r3al/Pro-Caption-AE/issues)
- 📧 Check the GitHub wiki for FAQs

---

## Pro Tips 💡

### For Best Results:
- Use **clear audio** (minimize background noise)
- Avoid **multiple speakers** talking at once
- Keep audio **consistent volume**
- Test with a **short clip first** (30 seconds)

### API Key Management:
- Your key is **stored locally** on your computer
- Never share your API key
- You can regenerate it anytime in Groq Console
- Free tier has a **generous monthly quota**

### Keyboard Shortcuts:
- **⌘/Ctrl + K** - Focus on API key input
- **⌘/Ctrl + T** - Start transcription
- **⌘/Ctrl + B** - Build captions
- Press **?** in the panel for full shortcuts list

---

## Frequently Asked Questions

**Q: Do I need a Groq account to use Pro Caption AE?**  
A: Yes, but it's free! Sign up at https://console.groq.com/

**Q: How much does the Groq API cost?**  
A: The free tier includes a generous monthly quota. Most users never hit the limit. You can see pricing at https://console.groq.com/pricing

**Q: Can I use this with other video editing software?**  
A: Currently, Pro Caption AE works only in Adobe After Effects 2024+.

**Q: How long does transcription take?**  
A: Usually 1-3 minutes depending on audio length. Groq's Whisper API is one of the fastest!

**Q: Can I edit captions after they're created?**  
A: Yes! They're standard After Effects text layers with keyframe animations. Edit them freely.

**Q: What if transcription is wrong?**  
A: You can manually edit the text in any caption layer, or adjust the glossary and re-transcribe.

---

## Ready to Go! 🚀

You're all set! Now go create some amazing viral-ready captions.

Questions? Join our [community discussions](https://github.com/64r3al/Pro-Caption-AE/discussions)

Happy captioning! 🎬✨

---

**Version**: 1.0.0  
**Last Updated**: September 27, 2026
