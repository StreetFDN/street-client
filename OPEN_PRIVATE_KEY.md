# How to Open GitHub Private Key File

## The Error is Normal!

The Keychain Access error is **expected** - the `.pem` file is a **text file**, not something for Keychain. Just dismiss the error dialog.

## How to Open the Private Key

### Option 1: Open in VS Code (Recommended)

1. In VS Code, go to **File → Open** (or `Cmd+O`)
2. Navigate to your **Downloads** folder
3. Look for: `dev-update-by-street-labs.2025-12-31.private-key.pem`
4. Open it - it's just a text file!

### Option 2: Open in TextEdit

1. Right-click the `.pem` file in Finder
2. Select **"Open With" → "TextEdit"**
3. Copy the entire contents

### Option 3: View in Terminal

```bash
cat ~/Downloads/dev-update-by-street-labs*.pem
```

---

## What the File Looks Like

The file will contain something like:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(lots of encoded characters)
...
-----END RSA PRIVATE KEY-----
```

## Next Steps

1. Open the file in a text editor (VS Code or TextEdit)
2. Select **ALL** the contents (Cmd+A)
3. Copy it (Cmd+C)
4. Paste it into Railway variables as `GITHUB_APP_PRIVATE_KEY`

**Important:** Include the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines!
