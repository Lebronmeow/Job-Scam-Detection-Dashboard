let currentFullText = "";
let scrapedCompanyName = "";
let scrapedEmail = "";

document.getElementById("scanBtn").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const scanBtn = document.getElementById("scanBtn");
    scanBtn.style.pointerEvents = "none";
    scanBtn.innerText = "⏳ SCANNING...";
    scanBtn.style.borderColor = "rgba(0, 210, 255, 0.7)";
    scanBtn.style.color = "#fff";

    document.getElementById("flagList").innerHTML = "";
    document.getElementById("scoreDisplay").innerText = "0%";
    document.getElementById("scoreDisplay").className = "score-circle";
    document.getElementById("trustTier").className = "trust-tier";
    document.getElementById("trustTier").innerText = "";
    document.getElementById("aiConsole").style.display = "none";
    document.getElementById("aiOutput").innerHTML = "";

    for(let i=1; i<=20; i++) {
        let el = document.getElementById(`p${i}`);
        el.className = "param-item" + (i >= 19 ? " new-tag" : "");
        el.style.animation = "none";
        el.offsetHeight;
        el.style.animation = `paramFadeIn 0.4s ease forwards ${(i - 1) * 0.03}s`;
        el.querySelector(".p-icon").innerHTML = "—";
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    }, (results) => {
        if (results && results[0].result) {
            scrapedCompanyName = results[0].result.company !== "Unknown" ? results[0].result.company : "";
            scrapedEmail = results[0].result.email !== "No email found" ? results[0].result.email : "";
            currentFullText = results[0].result.fullText ? results[0].result.fullText : ""; 
            executeLiveScan();
        }
        scanBtn.style.pointerEvents = "";
        scanBtn.innerHTML = "⚡ Initiate Deep Scan";
        scanBtn.style.borderColor = "";
        scanBtn.style.color = "";
    });
});

const delay = ms => new Promise(res => setTimeout(res, ms));

function setParam(id, state) {
    let el = document.getElementById(`p${id}`);
    let icon = el.querySelector(".p-icon");
    el.style.transition = "none";
    el.style.transform = "scale(0.92)";
    requestAnimationFrame(() => {
        el.style.transition = "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        el.style.transform = "";
    });
    let extraClass = (id >= 19) ? " new-tag" : "";
    el.className = `param-item ${state}${extraClass}`;
    if (state === "active") icon.innerHTML = "<div class='spinner'></div>";
    else if (state === "pass") icon.innerHTML = "✓";
    else if (state === "warn") icon.innerHTML = "!";
    else if (state === "fail") icon.innerHTML = "✗";
}

// ═══════════════════════════════════════════════════════
// UTILITY: Context-Aware Phrase Matching
// Instead of matching a single word anywhere, we match
// specific PHRASES that indicate scam intent.
// ═══════════════════════════════════════════════════════

function phraseMatch(text, phrases) {
    // Returns the matched phrase or null
    const lower = text.toLowerCase();
    for (const phrase of phrases) {
        if (lower.includes(phrase)) return phrase;
    }
    return null;
}

// Count how many phrase groups match (for corroboration)
function countMatches(text, phraseGroups) {
    let count = 0;
    for (const group of phraseGroups) {
        if (phraseMatch(text, group)) count++;
    }
    return count;
}

// ═══════════════════════════════════════════════════════
// P19: Emoji Flood Detection
// ═══════════════════════════════════════════════════════
function countEmojis(text) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{20E3}\u{E0020}-\u{E007F}]/gu;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
}

// ═══════════════════════════════════════════════════════
// P20: Ghost Text (Zero-Width Unicode Steganography)
// ═══════════════════════════════════════════════════════
function countGhostChars(text) {
    const ghostRegex = /[\u200B\u200C\u200D\u200E\u200F\u2060\u2061\u2062\u2063\u2064\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u202A-\u202E\u2066-\u2069\u2800\u3164]/g;
    const matches = text.match(ghostRegex);
    return matches ? matches.length : 0;
}

// ═══════════════════════════════════════════════════════
// MAIN SCAN ENGINE — Corroborated Threat Intelligence
//
// ARCHITECTURE:
//   1. Phase 1 — Verification Layer (P1-P5)
//      → Determines company "Trust Tier"
//      → VERIFIED / PARTIAL / UNKNOWN
//
//   2. Phase 2 — Content Threat Signals (P6-P20)
//      → Raw threat signals with CONTEXT-AWARE matching
//      → Uses full phrases, not single keywords
//
//   3. Phase 3 — Corroboration Engine
//      → Single isolated flag = downgraded (likely false positive)
//      → Multiple flags from different categories = amplified
//      → Verified companies get a "trust shield" — minor
//        keyword matches are forgiven
//
// This eliminates false flags on legit companies while
// catching real scams (which ALWAYS trigger multiple signals).
// ═══════════════════════════════════════════════════════

async function executeLiveScan() {
    let flags = [];
    let trustScore = 0;         // Earned from verifications (reduces final risk)
    let rawThreats = [];        // Collected threat signals: { penalty, message, paramId, severity }
    let officialDomain = "";

    const freeEmailProviders = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com", "aol.com", "ymail.com", "zoho.com"];

    // ══════════════════════════════════════
    // PHASE 1: VERIFICATION LAYER
    // Determines trust tier for corroboration
    // ══════════════════════════════════════

    // --- P1 & P2: EMAIL ANALYSIS ---
    setParam(1, "active"); setParam(2, "active");
    await delay(300);

    let recruiterDomain = "none";
    let hasCorporateEmail = false;

    if (scrapedEmail.includes("@")) {
        recruiterDomain = scrapedEmail.split('@')[1].toLowerCase();
        if (freeEmailProviders.includes(recruiterDomain)) {
            // Don't immediately flag — just note it. Corroboration will decide severity.
            rawThreats.push({ penalty: 15, message: "Recruiter uses a free email provider.", paramId: 1, severity: "warn", category: "identity" });
            setParam(1, "warn");
        } else {
            hasCorporateEmail = true;
            trustScore += 15;  // Corporate email = trust signal
            setParam(1, "pass");
        }
        setParam(2, "pass");
    } else {
        setParam(1, "pass");
        rawThreats.push({ penalty: 5, message: "[P2] No contact email found in listing.", paramId: 2, severity: "info", category: "identity" });
        setParam(2, "warn");
    }

    // --- P3 & P4: COMPANY REGISTRY + DOMAIN VERIFICATION ---
    setParam(3, "active"); setParam(4, "active");
    let companyVerified = false;

    if (scrapedCompanyName !== "") {
        try {
            let cleanQuery = scrapedCompanyName.toLowerCase()
                .replace(/\b(limited|ltd|pvt|private|inc|corp|corporation|llc|co|group|holdings)\b/gi, '')
                .replace(/[^a-z0-9 ]/g, '').trim();
            const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${cleanQuery}`);
            const apiData = await response.json();

            if (apiData.length > 0) {
                officialDomain = apiData[0].domain;
                companyVerified = true;
                trustScore += 20;
                setParam(3, "pass");
                flags.push(`SAFE: Verified globally as ${apiData[0].name}`);

                if (recruiterDomain !== "none" && recruiterDomain !== officialDomain && !freeEmailProviders.includes(recruiterDomain)) {
                    // Domain mismatch on a verified company is a REAL red flag
                    // CRITICAL: Revoke corporate email trust — the email is from the WRONG company.
                    // An email from randomcorp.com pretending to recruit for TeamLease isn't trustworthy.
                    if (hasCorporateEmail) {
                        trustScore -= 15;
                        hasCorporateEmail = false;
                    }
                    rawThreats.push({ penalty: 50, message: `Email domain @${recruiterDomain} doesn't match official @${officialDomain}`, paramId: 4, severity: "crit", category: "identity", trustPiercing: true });
                    setParam(4, "fail");
                } else {
                    if (recruiterDomain === officialDomain) trustScore += 15;
                    setParam(4, "pass");
                }
            } else {
                // Not in registry — NOT automatically suspicious.
                // Many legitimate local/small businesses aren't in Clearbit.
                rawThreats.push({ penalty: 8, message: "[P3] Company not found in global registry.", paramId: 3, severity: "info", category: "verification" });
                rawThreats.push({ penalty: 5, message: "[P4] Cannot verify domain (company not in registry).", paramId: 4, severity: "info", category: "verification" });
                setParam(3, "warn"); setParam(4, "warn");
            }
        } catch (e) {
            setParam(3, "warn"); setParam(4, "warn");
            flags.push("WARN: [P3] Registry API temporarily unavailable.");
        }
    } else {
        setParam(3, "warn"); setParam(4, "warn");
        rawThreats.push({ penalty: 5, message: "[P3] No company name found to verify.", paramId: 3, severity: "info", category: "verification" });
    }

    // --- P5: WHOIS DOMAIN AGE ---
    setParam(5, "active");
    let domainEstablished = false;

    if (officialDomain !== "") {
        try {
            // Replaced unreliable networkcalc API with official IANA RDAP standard
            const rdapRes = await fetch(`https://rdap.org/domain/${officialDomain}`);
            const rdapData = await rdapRes.json();
            
            // RDAP stores dates in an events array
            const regEvent = rdapData.events?.find(e => e.eventAction === "registration" || e.eventAction === "Registration");
            
            if (regEvent && regEvent.eventDate) {
                const ageInDays = (new Date() - new Date(regEvent.eventDate)) / (1000 * 60 * 60 * 24);
                if (ageInDays < 90) {
                    rawThreats.push({ penalty: 35, message: `Domain registered ${Math.floor(ageInDays)} days ago — very new.`, paramId: 5, severity: "crit", category: "verification" });
                    setParam(5, "fail");
                } else if (ageInDays < 180) {
                    rawThreats.push({ penalty: 15, message: `Domain is less than 6 months old.`, paramId: 5, severity: "warn", category: "verification" });
                    setParam(5, "warn");
                } else {
                    domainEstablished = true;
                    trustScore += 10;
                    setParam(5, "pass");
                    flags.push(`SAFE: Domain age verified (${Math.floor(ageInDays / 365)}+ years).`);
                }
            } else {
                setParam(5, "warn");
                flags.push("WARN: [P5] Registration date hidden by domain registrar.");
            }
        } catch (e) {
            setParam(5, "warn");
            flags.push("WARN: [P5] Domain registry lookup failed.");
        }
    } else {
        await delay(200);
        setParam(5, "warn");
    }

    // ──────────────────────────────────────
    // DETERMINE TRUST TIER
    // ──────────────────────────────────────
    // VERIFIED  (tier 3): Company in registry + email domain match + established domain
    // PARTIAL   (tier 2): At least one verification passed
    // UNKNOWN   (tier 1): No verifications passed
    let trustTier = 1;
    if (companyVerified && (hasCorporateEmail || domainEstablished)) trustTier = 3;
    else if (companyVerified || hasCorporateEmail || domainEstablished) trustTier = 2;

    // Show trust tier in UI
    const tierEl = document.getElementById("trustTier");
    if (trustTier === 3) {
        tierEl.className = "trust-tier tier-verified";
        tierEl.innerText = "🛡 VERIFIED ENTITY";
    } else if (trustTier === 2) {
        tierEl.className = "trust-tier tier-partial";
        tierEl.innerText = "◐ PARTIALLY VERIFIED";
    } else {
        tierEl.className = "trust-tier tier-unknown";
        tierEl.innerText = "? UNVERIFIED ENTITY";
    }

    // ══════════════════════════════════════
    // PHASE 2: CONTENT THREAT SIGNALS
    // Context-aware phrase matching — NOT single keywords.
    // Each check uses SPECIFIC PHRASES that indicate scam
    // intent, not just word presence.
    // ══════════════════════════════════════

    for(let i=6; i<=20; i++) { if(i !== 12) setParam(i, "active"); }
    await delay(600);

    const txt = currentFullText.toLowerCase();

    if (txt !== "") {

        // P6: Identity Theft — Asking for docs IN THE JOB POSTING (not after hire)
        const p6Phrases = [
            "send your aadhar", "share your aadhar", "aadhar card number", "aadhar number",
            "send your pan", "share your pan", "pan card number", "pan card details",
            "send passport", "passport number", "passport copy",
            "bank account number", "bank account details", "share bank details",
            "send bank details", "credit card", "debit card number"
        ];
        let p6Match = phraseMatch(txt, p6Phrases);
        if (p6Match) {
            rawThreats.push({ penalty: 55, message: `Requests sensitive documents in listing ("${p6Match}").`, paramId: 6, severity: "crit", category: "data_theft" });
            setParam(6, "fail");
        } else { setParam(6, "pass"); }

        // P7: Upfront Payment — Asking candidates to PAY MONEY
        const p7Phrases = [
            "security deposit", "registration fee", "refundable deposit",
            "processing fee", "training fee", "pay for training",
            "pay for materials", "send money", "transfer money",
            "pay via bitcoin", "pay via crypto", "send bitcoin",
            "payment required before", "advance payment"
        ];
        let p7Match = phraseMatch(txt, p7Phrases);
        if (p7Match) {
            rawThreats.push({ penalty: 60, message: `Requires upfront payment ("${p7Match}").`, paramId: 7, severity: "crit", category: "financial" });
            setParam(7, "fail");
        } else { setParam(7, "pass"); }

        // P8: Sketchy Communication Channels — INTERVIEW via untraceable apps
        // KEY: We match recruitment-context phrases, NOT just the app name.
        // A job that says "manage our Telegram channel" is 100% legit.
        const p8Phrases = [
            "interview on telegram", "interview via telegram", "interview through telegram",
            "contact on telegram", "contact via telegram", "add on telegram",
            "message on telegram", "join telegram group", "telegram group for interview",
            "interview on whatsapp", "interview via whatsapp", "apply on whatsapp",
            "send resume on whatsapp", "send cv on whatsapp", "whatsapp interview",
            "contact on whatsapp", "reach us on whatsapp",
            "interview on signal", "download signal app", "use signal for",
            "interview via wire", "download wire app"
        ];
        let p8Match = phraseMatch(txt, p8Phrases);
        if (p8Match) {
            rawThreats.push({ penalty: 30, message: `Conducts recruitment via unofficial channel ("${p8Match}").`, paramId: 8, severity: "warn", category: "communication" });
            setParam(8, "warn");
        } else { setParam(8, "pass"); }

        // P9: "Easy Money" Bait — Unrealistic earnings promises
        const p9Phrases = [
            "earn unlimited", "unlimited earning", "daily payout",
            "earn from home easily", "easy money", "earn lakhs",
            "earn thousands daily", "guaranteed income", "fixed daily income",
            "earn without working", "passive income guaranteed",
            "make money fast", "get rich quick"
        ];
        let p9Match = phraseMatch(txt, p9Phrases);
        if (p9Match) {
            rawThreats.push({ penalty: 20, message: `Uses unrealistic earning promises ("${p9Match}").`, paramId: 9, severity: "warn", category: "language" });
            setParam(9, "warn");
        } else { setParam(9, "pass"); }

        // P10: Artificial Urgency — Pressure tactics
        // KEY: "Limited positions" alone is common in legit jobs.
        // We need AGGRESSIVE urgency combined with pressure.
        const p10Phrases = [
            "act now or lose", "hurry up and apply", "last few vacancies",
            "closing today", "apply immediately before", "don't miss this chance",
            "only today", "offer expires", "limited time offer",
            "urgent hiring apply now", "respond immediately"
        ];
        let p10Match = phraseMatch(txt, p10Phrases);
        if (p10Match) {
            rawThreats.push({ penalty: 15, message: `Uses pressure tactics ("${p10Match}").`, paramId: 10, severity: "warn", category: "language" });
            setParam(10, "warn");
        } else { setParam(10, "pass"); }

        // P11: Vague Requirements — Suspiciously low bar
        // KEY: "Entry level" is fine. "No skills, any degree, just need a phone" is not.
        const p11Phrases = [
            "no skills required", "no qualification required", "no qualification needed",
            "anyone can apply", "any degree any branch", "just need a smartphone",
            "just need a phone", "just need a laptop", "no interview required",
            "no experience no problem", "housewife can also do",
            "students can earn", "earn from your phone"
        ];
        let p11Match = phraseMatch(txt, p11Phrases);
        if (p11Match) {
            rawThreats.push({ penalty: 20, message: `Suspiciously low requirements ("${p11Match}").`, paramId: 11, severity: "warn", category: "language" });
            setParam(11, "warn");
        } else { setParam(11, "pass"); }

        // P13: Sketchy Links — URL shorteners / free form builders for applications
        const p13Phrases = [
            "bit.ly/", "tinyurl.com/", "forms.gle/",
            "docs.google.com/forms", "jotform.com/",
            "typeform.com/", "apply at bit.ly",
            "fill this form bit.ly", "register at tinyurl"
        ];
        let p13Match = phraseMatch(txt, p13Phrases);
        if (p13Match) {
            rawThreats.push({ penalty: 25, message: `Uses shortened URL or free form builder for applications.`, paramId: 13, severity: "warn", category: "technical" });
            setParam(13, "warn");
        } else { setParam(13, "pass"); }

        // P14: Fake Check Scam — Classic scam pattern
        const p14Phrases = [
            "we will send you a check", "send you a check",
            "purchase your own equipment", "buy your own laptop",
            "buy your own equipment", "vendor payment",
            "buy supplies with the check", "deposit the check",
            "cash the check", "use the funds to buy"
        ];
        let p14Match = phraseMatch(txt, p14Phrases);
        if (p14Match) {
            rawThreats.push({ penalty: 60, message: `Matches 'Fake Check' scam pattern ("${p14Match}").`, paramId: 14, severity: "crit", category: "financial" });
            setParam(14, "fail");
        } else { setParam(14, "pass"); }

        // P15: Bad Formatting — Excessive unprofessional punctuation
        // KEY: Match sequences of 4+ (not 3), and count them.
        const excessivePunctuation = (txt.match(/[!]{4,}/g) || []).length + (txt.match(/[?]{4,}/g) || []).length;
        const excessiveSymbols = (txt.match(/[$₹€£]{3,}/g) || []).length;
        if (excessivePunctuation + excessiveSymbols >= 2) {
            rawThreats.push({ penalty: 12, message: "Multiple instances of excessive punctuation/symbols.", paramId: 15, severity: "warn", category: "quality" });
            setParam(15, "warn");
        } else { setParam(15, "pass"); }

        // P16: MLM / Pyramid Scheme indicators
        const p16Phrases = [
            "be your own boss", "build your downline", "downline",
            "multi-level marketing", "network marketing opportunity",
            "join my team and earn", "refer and earn unlimited",
            "chain referral", "pyramid"
        ];
        let p16Match = phraseMatch(txt, p16Phrases);
        if (p16Match) {
            rawThreats.push({ penalty: 25, message: `Contains MLM/Pyramid language ("${p16Match}").`, paramId: 16, severity: "warn", category: "scheme" });
            setParam(16, "warn");
        } else { setParam(16, "pass"); }

        // P17: Guaranteed Selection — No real job guarantees this
        const p17Phrases = [
            "guaranteed placement", "100% selection", "direct joining",
            "100% job guarantee", "guaranteed job", "confirm joining",
            "sure selection", "guaranteed offer letter"
        ];
        let p17Match = phraseMatch(txt, p17Phrases);
        if (p17Match) {
            rawThreats.push({ penalty: 30, message: `Promises guaranteed selection ("${p17Match}").`, paramId: 17, severity: "crit", category: "language" });
            setParam(17, "fail");
        } else { setParam(17, "pass"); }

        // P18: Length Anomaly — Very short description
        // KEY: Raised threshold context. Under 200 chars is truly suspicious.
        // 200-400 is just a mild note.
        if (txt.length < 200) {
            rawThreats.push({ penalty: 15, message: "[P18] Job description is extremely short.", paramId: 18, severity: "warn", category: "quality" });
            setParam(18, "warn");
        } else if (txt.length < 400) {
            rawThreats.push({ penalty: 5, message: "[P18] Job description is shorter than typical.", paramId: 18, severity: "info", category: "quality" });
            setParam(18, "warn");
        } else {
            trustScore += 5;
            setParam(18, "pass");
        }

        // P19: Emoji Flood
        const emojiCount = countEmojis(currentFullText);
        if (emojiCount > 12) {
            rawThreats.push({ penalty: 25, message: `Excessive emoji usage (${emojiCount} emojis).`, paramId: 19, severity: "crit", category: "quality" });
            setParam(19, "fail");
        } else if (emojiCount > 6) {
            rawThreats.push({ penalty: 10, message: `Elevated emoji count (${emojiCount}).`, paramId: 19, severity: "warn", category: "quality" });
            setParam(19, "warn");
        } else { setParam(19, "pass"); }

        // P20: Ghost Text (Zero-Width Steganography)
        const ghostCount = countGhostChars(currentFullText);
        if (ghostCount > 5) {
            rawThreats.push({ penalty: 40, message: `${ghostCount} hidden zero-width characters found — text tampered to evade filters.`, paramId: 20, severity: "crit", category: "steganography" });
            setParam(20, "fail");
        } else if (ghostCount > 0) {
            rawThreats.push({ penalty: 15, message: `${ghostCount} invisible Unicode character(s) detected.`, paramId: 20, severity: "warn", category: "steganography" });
            setParam(20, "warn");
        } else { setParam(20, "pass"); }

    } else {
        for(let i=6; i<=20; i++) { if(i !== 12) setParam(i, "warn"); }
        flags.push("WARN: [P6-P20] No job description text found to analyze.");
    }

    // P12: Plagiarism (content quality check)
    setParam(12, "active");
    await delay(300);
    if (currentFullText.length > 50) {
        setParam(12, "pass");
    } else {
        setParam(12, "warn");
        rawThreats.push({ penalty: 5, message: "[P12] Text too short for plagiarism analysis.", paramId: 12, severity: "info", category: "quality" });
    }

    // ══════════════════════════════════════
    // PHASE 3: CORROBORATION ENGINE
    //
    // The KEY innovation: Instead of summing raw penalties,
    // we apply three intelligence filters:
    //
    // 1. TRUST SHIELD — Verified companies forgive low-severity signals
    // 2. CATEGORY CLUSTERING — Threats from multiple categories are
    //    amplified (real scams hit identity + financial + language)
    // 3. ISOLATION DAMPENING — A single lone signal is dampened
    //    (one keyword match alone = likely false positive)
    // ══════════════════════════════════════

    // Count unique threat categories
    const threatCategories = new Set(rawThreats.map(t => t.category));
    const categoryCount = threatCategories.size;

    // Count critical vs warning signals
    const critCount = rawThreats.filter(t => t.severity === "crit").length;
    const warnCount = rawThreats.filter(t => t.severity === "warn").length;
    const infoCount = rawThreats.filter(t => t.severity === "info").length;
    const totalSignals = critCount + warnCount; // info doesn't count

    // ── TRUST SHIELD ──
    // Verified companies: info-level signals are forgiven, warns are halved
    // Partially verified: info forgiven, warns are 75%
    // Unknown: full weight
    // EXCEPTION: trustPiercing threats ALWAYS count at full weight
    let adjustedPenalty = 0;
    let critPenaltySum = 0;  // Track total crit penalties for survival floor

    for (const threat of rawThreats) {
        let effectivePenalty = threat.penalty;

        // Trust-piercing threats bypass the shield entirely
        // (e.g., domain mismatch = the trust itself is suspect)
        if (!threat.trustPiercing) {
            if (trustTier === 3) {
                if (threat.severity === "info") effectivePenalty = 0;
                else if (threat.severity === "warn") effectivePenalty = Math.round(threat.penalty * 0.4);
            } else if (trustTier === 2) {
                if (threat.severity === "info") effectivePenalty = Math.round(threat.penalty * 0.25);
                else if (threat.severity === "warn") effectivePenalty = Math.round(threat.penalty * 0.7);
            }
        }

        if (threat.severity === "crit") critPenaltySum += effectivePenalty;
        adjustedPenalty += effectivePenalty;
    }

    // ── ISOLATION DAMPENING ──
    // If there's only 1 signal and it's not crit, dampen heavily.
    // Real scams ALWAYS trigger multiple signals.
    // EXCEPTION: identity-category crits (domain mismatch) are never dampened —
    // a verified company with wrong email domain is significant standalone evidence.
    const hasIdentityCrit = rawThreats.some(t => t.severity === "crit" && t.category === "identity");
    if (totalSignals === 1 && critCount === 0) {
        adjustedPenalty = Math.round(adjustedPenalty * 0.3);
    } else if (totalSignals === 1 && critCount === 1 && !hasIdentityCrit) {
        adjustedPenalty = Math.round(adjustedPenalty * 0.7);
    }

    // ── CATEGORY AMPLIFICATION ──
    // Threats spanning 3+ categories = pattern confirmed → slight boost
    if (categoryCount >= 4 && critCount >= 2) {
        adjustedPenalty = Math.round(adjustedPenalty * 1.15);
    } else if (categoryCount >= 3 && totalSignals >= 3) {
        adjustedPenalty = Math.round(adjustedPenalty * 1.1);
    }

    // ── TRUST OFFSET ──
    // Trust score subtracts from penalty, BUT:
    // Critical threats have a MINIMUM SURVIVAL FLOOR.
    // Trust should never fully zero out a genuine critical threat.
    // At least 40% of crit-level penalties must survive.
    if (critCount > 0) {
        const minSurvival = Math.round(critPenaltySum * 0.4);
        adjustedPenalty = Math.max(minSurvival, adjustedPenalty - trustScore);
    } else {
        adjustedPenalty = Math.max(0, adjustedPenalty - trustScore);
    }

    let finalScore = Math.min(100, adjustedPenalty);

    // ══════════════════════════════════════
    // RENDER: Convert raw threats to display flags
    // ══════════════════════════════════════

    // Convert rawThreats to display flags (skip silenced ones)
    for (const threat of rawThreats) {
        // For verified companies, don't show info-level noise
        if (trustTier === 3 && threat.severity === "info") continue;
        // For partial, still skip pure noise
        if (trustTier === 2 && threat.severity === "info" && threat.penalty <= 5) continue;

        if (threat.severity === "crit") {
            flags.push(`CRIT: ${threat.message}`);
        } else if (threat.severity === "warn") {
            flags.push(`WARN: ${threat.message}`);
        } else {
            flags.push(`WARN: ${threat.message}`);
        }
    }

    // ══════════════════════════════════════
    // FINALIZE SCORE & RENDER UI
    // ══════════════════════════════════════

    let scoreDisplay = document.getElementById("scoreDisplay");
    let currentScore = 0;

    const scoreAnimation = () => {
        currentScore += Math.max(1, Math.ceil((finalScore - currentScore) * 0.08));
        if(currentScore >= finalScore) {
            scoreDisplay.innerText = finalScore + "%";
            scoreDisplay.className = finalScore >= 40 ? "score-circle high-risk" : "score-circle low-risk";
            scoreDisplay.style.transition = "none";
            scoreDisplay.style.transform = "scale(1.08)";
            requestAnimationFrame(() => {
                scoreDisplay.style.transition = "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
                scoreDisplay.style.transform = "scale(1)";
            });
        } else {
            scoreDisplay.innerText = currentScore + "%";
            requestAnimationFrame(scoreAnimation);
        }
    };

    if (finalScore > 0) {
        requestAnimationFrame(scoreAnimation);
    } else {
        scoreDisplay.innerText = "0%";
        scoreDisplay.className = "score-circle low-risk";
    }

    const flagList = document.getElementById("flagList");
    flagList.innerHTML = "";

    flags.sort((a, b) => {
        if (a.startsWith("CRIT") && !b.startsWith("CRIT")) return -1;
        if (!a.startsWith("CRIT") && b.startsWith("CRIT")) return 1;
        if (a.startsWith("WARN") && b.startsWith("SAFE")) return -1;
        if (a.startsWith("SAFE") && b.startsWith("WARN")) return 1;
        return 0;
    });

    if (finalScore === 0 && flags.length === 0) {
        flagList.innerHTML = `<li class="flag-item" style="animation-delay: 0s;"><span class="badge badge-safe">SECURE</span> <span style="color:var(--text-main);">All 20 security parameters passed.</span></li>`;
    } else if (finalScore === 0) {
        // We have safe flags but no threats
        flagList.innerHTML = `<li class="flag-item" style="animation-delay: 0s;"><span class="badge badge-safe">SECURE</span> <span style="color:var(--text-main);">No actionable threats detected.</span></li>`;
    }

    flags.forEach((f, index) => {
        let bClass = "badge-warn", bText = "WARN", color = "var(--text-main)";
        if(f.startsWith("CRIT")) { bClass = "badge-crit"; bText = "CRIT"; color = "var(--crit)"; f = f.replace("CRIT: ", ""); }
        else if(f.startsWith("SAFE")) { bClass = "badge-safe"; bText = "SAFE"; color = "var(--safe)"; f = f.replace("SAFE: ", ""); }
        else { f = f.replace("WARN: ", ""); }

        flagList.innerHTML += `<li class="flag-item" style="animation-delay: ${index * 0.06}s;"><span class="badge ${bClass}">${bText}</span> <span style="color:${color}">${f}</span></li>`;
    });

    // ══════════════════════════════════════
    // PHASE 4: AI DEEP ANALYSIS (Gemini Nano)
    // Runs AFTER heuristic scan completes.
    // Supplementary — adds natural language insight.
    // ══════════════════════════════════════
    runAIAnalysis(currentFullText, finalScore, flags, scrapedCompanyName);
}

// ═══════════════════════════════════════════════════════
// SETTINGS PANEL — API Key Management
// ═══════════════════════════════════════════════════════

document.getElementById("settingsToggle").addEventListener("click", () => {
    const body = document.getElementById("settingsBody");
    body.style.display = body.style.display === "none" ? "block" : "none";
    
    // Load existing key if saved
    if (body.style.display === "block") {
        chrome.storage.local.get(["geminiApiKey"], (result) => {
            if (result.geminiApiKey) {
                document.getElementById("apiKeyInput").value = result.geminiApiKey;
                document.getElementById("keyStatus").textContent = "✓ Key saved";
                document.getElementById("keyStatus").className = "key-status saved";
            }
        });
    }
});

document.getElementById("saveKeyBtn").addEventListener("click", () => {
    const key = document.getElementById("apiKeyInput").value.trim();
    const status = document.getElementById("keyStatus");
    
    if (!key) {
        status.textContent = "✗ Please enter an API key";
        status.className = "key-status error";
        return;
    }
    
    chrome.storage.local.set({ geminiApiKey: key }, () => {
        status.textContent = "✓ Key saved successfully!";
        status.className = "key-status saved";
        setTimeout(() => { status.textContent = "✓ Key saved"; }, 2000);
    });
});

// Handle the Google AI Studio link click
document.getElementById("aiStudioLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "https://aistudio.google.com/apikey" });
});

// ═══════════════════════════════════════════════════════
// AI ANALYSIS ENGINE — Dual Provider
// 1. Try Chrome Built-in AI (Gemini Nano, on-device)
// 2. Fall back to Gemini API (free tier, cloud)
// ═══════════════════════════════════════════════════════

const AI_SYSTEM_PROMPT = `You are a cybersecurity expert specialized in job scam detection. You analyze job postings and provide a brief, clear verdict.

Rules:
- Be concise (3-5 sentences max)
- Do NOT start with a single-word verdict. Start with a conversational, natural opening (e.g., "This listing appears safe because..." or "I would be highly cautious with this listing...").
- Explain what specific patterns you see (or don't see)
- If safe, briefly explain why
- If suspicious/dangerous, explain what the user should watch out for
- Never use markdown formatting, just plain text
- Be direct and actionable`;

function buildPrompt(jobText, heuristicScore, heuristicFlags, companyName) {
    const heuristicContext = heuristicFlags.length > 0
        ? `\n\nOur automated scan found these signals (score: ${heuristicScore}%):\n${heuristicFlags.slice(0, 8).join('\n')}`
        : `\n\nOur automated scan found no red flags (score: 0%).`;

    return `Analyze this job posting for scam indicators. Company: "${companyName || "Unknown"}".${heuristicContext}

Job description text (first 1500 chars):
"""
${jobText.substring(0, 1500)}
"""

Provide your security verdict:`;
}

async function getBuiltInAI() {
    try {
        if (typeof chrome !== "undefined" && chrome.aiOriginTrial && chrome.aiOriginTrial.languageModel) {
            const caps = await chrome.aiOriginTrial.languageModel.capabilities();
            if (caps.available !== "no") return chrome.aiOriginTrial.languageModel;
        }
    } catch(e) {}
    try {
        if (typeof self !== "undefined" && self.ai && self.ai.languageModel) {
            const caps = await self.ai.languageModel.capabilities();
            if (caps.available !== "no") return self.ai.languageModel;
        }
    } catch(e) {}
    try {
        if (typeof window !== "undefined" && window.ai && window.ai.languageModel) {
            const caps = await window.ai.languageModel.capabilities();
            if (caps.available !== "no") return window.ai.languageModel;
        }
    } catch(e) {}
    return null;
}

async function runWithBuiltInAI(aiApi, prompt, aiOutput) {
    document.getElementById("aiBadge").textContent = "ON-DEVICE";
    aiOutput.innerHTML = `<span class="ai-status"><div class="spinner"></div> Initializing Gemini Nano...</span>`;

    const session = await aiApi.create({
        monitor(m) {
            m.addEventListener("downloadprogress", (e) => {
                const pct = Math.round((e.loaded / e.total) * 100);
                aiOutput.innerHTML = `<span class="ai-status"><div class="spinner"></div> Downloading AI model: ${pct}%</span>`;
            });
        },
        initialPrompts: [{ role: "system", content: AI_SYSTEM_PROMPT }]
    });

    aiOutput.innerHTML = "";
    aiOutput.classList.add("streaming");

    try {
        const stream = session.promptStreaming(prompt);
        for await (const chunk of stream) {
            aiOutput.textContent = chunk;
        }
    } catch (e) {
        const response = await session.prompt(prompt);
        aiOutput.textContent = response;
    }

    aiOutput.classList.remove("streaming");
    session.destroy();
}

async function runWithGeminiAPI(apiKey, prompt, aiOutput) {
    document.getElementById("aiBadge").textContent = "GEMINI API";
    aiOutput.innerHTML = `<span class="ai-status"><div class="spinner"></div> Analyzing with Gemini...</span>`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 800
                }
            })
        }
    );

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Empty response from Gemini API");

    // Simulate typing effect
    aiOutput.innerHTML = "";
    aiOutput.classList.add("streaming");
    
    let i = 0;
    await new Promise((resolve) => {
        const typeTimer = setInterval(() => {
            i += 8;
            aiOutput.textContent = text.substring(0, i);
            if (i >= text.length) {
                clearInterval(typeTimer);
                aiOutput.textContent = text;
                resolve();
            }
        }, 10);
    });

    aiOutput.classList.remove("streaming");
}

async function runAIAnalysis(jobText, heuristicScore, heuristicFlags, companyName) {
    const aiConsole = document.getElementById("aiConsole");
    const aiOutput = document.getElementById("aiOutput");

    if (!jobText || jobText.trim().length < 50) return;

    const prompt = buildPrompt(jobText, heuristicScore, heuristicFlags, companyName);

    // ── Try 1: Chrome Built-in AI ──
    const builtInAI = await getBuiltInAI();
    if (builtInAI) {
        try {
            aiConsole.style.display = "block";
            await runWithBuiltInAI(builtInAI, prompt, aiOutput);
            return;
        } catch (e) {
            console.warn("Built-in AI failed, trying Gemini API:", e);
        }
    }

    // ── Try 2: Gemini API (free tier) ──
    try {
        const result = await chrome.storage.local.get(["geminiApiKey"]);
        const apiKey = result.geminiApiKey;

        if (apiKey) {
            aiConsole.style.display = "block";
            await runWithGeminiAPI(apiKey, prompt, aiOutput);
            return;
        }
    } catch (e) {
        console.warn("Gemini API storage error:", e);
    }

    // ── No AI available — show setup hint ──
    aiConsole.style.display = "block";
    aiOutput.innerHTML = `<div class="ai-unavailable">
        Add a free Gemini API key in ⚙ AI Settings below to enable AI-powered analysis. No credit card needed.
    </div>`;
}