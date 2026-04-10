# 🛡️ Shield: Deep Scan

**A Chrome extension that detects job scams using heuristic NLP and domain analysis — before you apply.**

---

## 📌 What It Does

Job scam postings are increasingly sophisticated. Shield: Deep Scan analyzes job listings in real time directly in your browser, flagging suspicious patterns such as:

- Vague or exaggerated salary promises
- Requests for personal/financial information upfront
- Unverified or newly registered employer domains (via official ICANN RDAP)
- Advanced evasion techniques like **Emoji Flooding** and **Ghost Text** (invisible Unicode steganography)
- Analyzes context using a **Corroborated Threat Intelligence** engine (cross-referencing domain trust tiers with linguistic flags)
- Provides a final **AI Deep Analysis** sanity check using the Cloud Gemini API

---

## 🚀 Installation (Developer Mode)

Since this extension is not yet on the Chrome Web Store, install it manually:

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/Lebronmeow/JobScamExtention.git
   ```

2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer Mode** (toggle in the top-right corner).

4. Click **"Load unpacked"** and select the cloned folder.

5. The **Shield: Deep Scan** icon will appear in your Chrome toolbar.

---

## 🧩 How to Use

1. Navigate to any job listing page (e.g. LinkedIn, Indeed, Glassdoor).
2. Click the **Shield: Deep Scan** icon in your toolbar.
3. Hit **"Scan"** — the extension will analyze the current page.
4. A result will indicate whether the listing appears **Safe**, **Suspicious**, or a **Likely Scam**, along with reasons.

---

## 🗂️ Project Structure

```
JobScamExtention/
├── manifest.json   # Extension config (Manifest V3)
├── popup.html      # Toolbar popup UI
├── popup.js        # Popup logic & scan trigger
└── content.js      # Page content script — core scam detection engine
```

---

## ⚙️ Technical Details

| Property | Value |
|---|---|
| Manifest Version | V3 |
| Permissions | `activeTab`, `scripting`, `storage` |
| Detection Method | Corroborated Heuristic NLP + RDAP Domain Checks + Generative AI |
| Language | JavaScript |

---

## 🔐 Privacy

Shield: Deep Scan operates **entirely in your browser**. It does not send any page content or personal data to external servers. All analysis happens locally.

---

## 🛣️ Roadmap

- [ ] Chrome Web Store release
- [ ] Support for more job platforms
- [ ] Confidence score with detailed breakdown
- [ ] User-reported scam database
- [ ] Firefox support

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push and open a Pull Request

---

## 📄 License

This project does not currently specify a license. Contact the repository owner for usage permissions.

---

*Built to help job seekers stay safe online.*
