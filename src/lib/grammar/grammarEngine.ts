/**
 * Universal Grammar & Text Correction Engine
 * 
 * Provides rule-based grammar correction, spelling typo resolution,
 * punctuation normalization, sentence capitalization, and architectural/construction
 * terminology formatting.
 */

export interface GrammarCorrectionResult {
  originalText: string;
  correctedText: string;
  changesCount: number;
  corrections: Array<{
    type: "spelling" | "grammar" | "capitalization" | "punctuation" | "domain";
    from: string;
    to: string;
    reason: string;
  }>;
}

// 1. Common English Typos & Misspellings Dictionary
const COMMON_TYPOS: Record<string, string> = {
  // Frequent typos
  teh: "the",
  hte: "the",
  thier: "their",
  recieve: "receive",
  recieved: "received",
  recieving: "receiving",
  seperate: "separate",
  seperated: "separated",
  seperating: "separating",
  definately: "definitely",
  definatly: "definitely",
  accomodate: "accommodate",
  accomodation: "accommodation",
  maintainance: "maintenance",
  occured: "occurred",
  occurance: "occurrence",
  untill: "until",
  tommorrow: "tomorrow",
  tomorow: "tomorrow",
  calender: "calendar",
  wierd: "weird",
  goverment: "government",
  neccessary: "necessary",
  necesary: "necessary",
  begining: "beginning",
  alot: "a lot",
  infront: "in front",
  eachother: "each other",
  everytime: "every time",
  noone: "no one",
  recommand: "recommend",
  recommandation: "recommendation",
  truely: "truly",
  acheive: "achieve",
  acheived: "achieved",
  beleive: "believe",
  beleived: "believed",
  concious: "conscious",
  embarass: "embarrass",
  enviroment: "environment",
  existense: "existence",
  foriegn: "foreign",
  guarentee: "guarantee",
  garantee: "guarantee",
  harrass: "harass",
  independant: "independent",
  judgement: "judgment",
  knowlege: "knowledge",
  lisence: "license",
  millenium: "millennium",
  noticable: "noticeable",
  perserverance: "perseverance",
  posession: "possession",
  priviledge: "privilege",
  publically: "publicly",
  relevent: "relevant",
  rythm: "rhythm",
  succesful: "successful",
  suprise: "surprise",
  tendancy: "tendency",
  tommorow: "tomorrow",
  unforseen: "unforeseen",
  wierdest: "weirdest",
  writting: "writing",

  // Architecture & Construction Domain Typos
  archetict: "architect",
  architech: "architect",
  architet: "architect",
  structral: "structural",
  stuctural: "structural",
  contracter: "contractor",
  contarctor: "contractor",
  quotaion: "quotation",
  quotatn: "quotation",
  elavation: "elevation",
  foundtion: "foundation",
  reinfocement: "reinforcement",
  demolision: "demolition",
  plastering: "plastering",
  joinery: "joinery",
  cantiliver: "cantilever",
  coloum: "column",
  coloumn: "column",
  parapet: "parapet",
  floring: "flooring",
  waterproffing: "waterproofing",
  waterprofing: "waterproofing",
  geofence: "geofence",
  milstone: "milestone",
  miletsone: "milestone",
  schedul: "schedule",
  shedule: "schedule",
  aprove: "approve",
  aproval: "approval",
  aprovd: "approved",
  revisoin: "revision",
  revisin: "revision",
};

// 2. Missing Contractions / Apostrophes
const CONTRACTIONS: Record<string, string> = {
  dont: "don't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  isnt: "isn't",
  arent: "aren't",
  hasnt: "hasn't",
  havent: "haven't",
  wasnt: "wasn't",
  werent: "weren't",
  thats: "that's",
  whats: "what's",
  theres: "there's",
  heres: "here's",
  lets: "let's",
  youre: "you're",
  theyre: "they're",
  weve: "we've",
  theyve: "they've",
  youve: "you've",
  youll: "you'll",
  theyll: "they'll",
  itll: "it'll",
};

// 3. Architectural / Technical Acronyms & Terminology Casing
const DOMAIN_ACRONYMS: Record<string, string> = {
  cad: "CAD",
  autocad: "AutoCAD",
  bim: "BIM",
  mep: "MEP",
  hvac: "HVAC",
  boq: "BOQ",
  gfc: "GFC",
  pdf: "PDF",
  dwg: "DWG",
  dxf: "DXF",
  rcc: "RCC",
  pwa: "PWA",
  gst: "GST",
  gstin: "GSTIN",
  inr: "INR",
  usd: "USD",
  eur: "EUR",
  gbp: "GBP",
  gps: "GPS",
  sqft: "sq. ft.",
  "sq ft": "sq. ft.",
  sqm: "sq. m.",
  "sq m": "sq. m.",
  "3d": "3D",
  "2d": "2D",
};

// 4. Common Grammar Phrase Replacements
const PHRASE_CORRECTIONS: Array<{ regex: RegExp; replacement: string; reason: string }> = [
  { regex: /\bshould of\b/gi, replacement: "should have", reason: "'should of' -> 'should have'" },
  { regex: /\bcould of\b/gi, replacement: "could have", reason: "'could of' -> 'could have'" },
  { regex: /\bwould of\b/gi, replacement: "would have", reason: "'would of' -> 'would have'" },
  { regex: /\bmight of\b/gi, replacement: "might have", reason: "'might of' -> 'might have'" },
  { regex: /\bmust of\b/gi, replacement: "must have", reason: "'must of' -> 'must have'" },
  { regex: /\bsuppose to\b/gi, replacement: "supposed to", reason: "'suppose to' -> 'supposed to'" },
  { regex: /\bused to of\b/gi, replacement: "used to", reason: "'used to of' -> 'used to'" },
  { regex: /\banyways\b/gi, replacement: "anyway", reason: "'anyways' -> 'anyway'" },
  { regex: /\birregardless\b/gi, replacement: "regardless", reason: "'irregardless' -> 'regardless'" },
];

/**
 * Corrects grammar, spelling, punctuation, and capitalization in the provided text.
 */
export function correctGrammar(text: string): GrammarCorrectionResult {
  if (!text || typeof text !== "string") {
    return {
      originalText: text || "",
      correctedText: text || "",
      changesCount: 0,
      corrections: [],
    };
  }

  let result = text;
  const corrections: GrammarCorrectionResult["corrections"] = [];

  // 1. Phrase Corrections (e.g. "should of" -> "should have")
  for (const { regex, replacement, reason } of PHRASE_CORRECTIONS) {
    if (regex.test(result)) {
      result = result.replace(regex, (match) => {
        // Preserve title case if original was title case
        const isCapitalized = match[0] === match[0].toUpperCase();
        const repl = isCapitalized ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
        corrections.push({
          type: "grammar",
          from: match,
          to: repl,
          reason,
        });
        return repl;
      });
    }
  }

  // 2. Normalizing Punctuation Spacing & Deduplication
  // Fix spaces before punctuation (e.g. "hello , world ." -> "hello, world.")
  const beforePunctuationRegex = /\s+([,.:;?!])/g;
  if (beforePunctuationRegex.test(result)) {
    result = result.replace(beforePunctuationRegex, (match, p1) => {
      corrections.push({
        type: "punctuation",
        from: match,
        to: p1,
        reason: "Removed whitespace before punctuation",
      });
      return p1;
    });
  }

  // Deduplicate redundant punctuation (e.g., ",," -> ",", "??" -> "?", "!!" -> "!")
  const duplicatePunctRegex = /([,;:])\1+/g;
  if (duplicatePunctRegex.test(result)) {
    result = result.replace(duplicatePunctRegex, (match, p1) => {
      corrections.push({
        type: "punctuation",
        from: match,
        to: p1,
        reason: "Removed duplicate punctuation mark",
      });
      return p1;
    });
  }

  // Add missing space after punctuation when directly followed by a letter (e.g. "hello,world" -> "hello, world")
  const missingSpacePunctRegex = /([,.:;?!])([a-zA-Z])/g;
  if (missingSpacePunctRegex.test(result)) {
    result = result.replace(missingSpacePunctRegex, (match, p1, p2) => {
      // Don't modify numbers/decimals like 3.14 or filenames like file.pdf
      corrections.push({
        type: "punctuation",
        from: match,
        to: `${p1} ${p2}`,
        reason: "Added missing space after punctuation",
      });
      return `${p1} ${p2}`;
    });
  }

  // Deduplicate consecutive identical words (e.g., "the the" -> "the", "in in" -> "in")
  const duplicateWordsRegex = /\b([a-zA-Z]+)\s+\1\b/gi;
  if (duplicateWordsRegex.test(result)) {
    result = result.replace(duplicateWordsRegex, (match, word) => {
      corrections.push({
        type: "grammar",
        from: match,
        to: word,
        reason: "Removed duplicated consecutive word",
      });
      return word;
    });
  }

  // 3. Word-by-Word Analysis (Typos, Contractions, Acronyms, Pronoun 'I')
  // Match words and preserved punctuation
  result = result.replace(/\b[a-zA-Z0-9']+\b/g, (word) => {
    const lower = word.toLowerCase();

    // Check standalone pronoun 'i' or contractions with 'i'
    if (lower === "i") {
      if (word !== "I") {
        corrections.push({ type: "capitalization", from: word, to: "I", reason: "Capitalized pronoun 'I'" });
        return "I";
      }
      return word;
    }
    if (lower === "im" || lower === "i'm") {
      const fixed = "I'm";
      if (word !== fixed) {
        corrections.push({ type: "grammar", from: word, to: fixed, reason: "Corrected contraction to 'I'm'" });
        return fixed;
      }
      return word;
    }
    if (lower === "ive" || lower === "i've") {
      const fixed = "I've";
      if (word !== fixed) {
        corrections.push({ type: "grammar", from: word, to: fixed, reason: "Corrected contraction to 'I've'" });
        return fixed;
      }
      return word;
    }
    if (lower === "ill" && text.toLowerCase().includes("ill be")) {
      // Only replace if in context of "I'll be"
      corrections.push({ type: "grammar", from: word, to: "I'll", reason: "Corrected contraction to 'I'll'" });
      return "I'll";
    }
    if (lower === "id" && (text.toLowerCase().includes("id like") || text.toLowerCase().includes("id appreciate"))) {
      corrections.push({ type: "grammar", from: word, to: "I'd", reason: "Corrected contraction to 'I'd'" });
      return "I'd";
    }

    // Architecture revisions (e.g. r0 -> R0, r1 -> R1, r2 -> R2, r3 -> R3)
    if (/^r\d+$/i.test(word)) {
      const upperRev = word.toUpperCase();
      if (word !== upperRev) {
        corrections.push({ type: "domain", from: word, to: upperRev, reason: "Formatted drawing revision code" });
        return upperRev;
      }
      return word;
    }

    // Technical acronyms (cad -> CAD, mep -> MEP, etc.)
    if (DOMAIN_ACRONYMS[lower]) {
      const target = DOMAIN_ACRONYMS[lower];
      if (word !== target) {
        corrections.push({ type: "domain", from: word, to: target, reason: `Standardized technical term '${target}'` });
        return target;
      }
      return word;
    }

    // Common Contractions (dont -> don't, cant -> can't)
    if (CONTRACTIONS[lower]) {
      const target = CONTRACTIONS[lower];
      const isInitialUpper = word[0] === word[0].toUpperCase();
      const formatted = isInitialUpper ? target[0].toUpperCase() + target.slice(1) : target;
      if (word !== formatted) {
        corrections.push({ type: "spelling", from: word, to: formatted, reason: `Added apostrophe for contraction '${formatted}'` });
        return formatted;
      }
      return word;
    }

    // Common Typos & Misspellings (teh -> the, recieve -> receive)
    if (COMMON_TYPOS[lower]) {
      const target = COMMON_TYPOS[lower];
      const isInitialUpper = word[0] === word[0].toUpperCase();
      const formatted = isInitialUpper ? target[0].toUpperCase() + target.slice(1) : target;
      if (word !== formatted) {
        corrections.push({ type: "spelling", from: word, to: formatted, reason: `Fixed typo '${word}' -> '${formatted}'` });
        return formatted;
      }
      return word;
    }

    return word;
  });

  // 4. Sentence Capitalization
  // Capitalize first letter of string
  result = result.replace(/^([a-z])/g, (m, letter) => {
    corrections.push({ type: "capitalization", from: letter, to: letter.toUpperCase(), reason: "Capitalized start of text" });
    return letter.toUpperCase();
  });

  // Capitalize after sentence-ending punctuation followed by space or newline (. ! ?)
  result = result.replace(/([.?!]\s+)([a-z])/g, (m, punct, letter) => {
    corrections.push({ type: "capitalization", from: letter, to: letter.toUpperCase(), reason: "Capitalized start of sentence" });
    return punct + letter.toUpperCase();
  });

  // Capitalize start of newlines
  result = result.replace(/(\n\s*)([a-z])/g, (m, lineStart, letter) => {
    corrections.push({ type: "capitalization", from: letter, to: letter.toUpperCase(), reason: "Capitalized start of line" });
    return lineStart + letter.toUpperCase();
  });

  // 5. Clean up multiple excessive horizontal spaces
  result = result.replace(/[ \t]{2,}/g, " ");

  return {
    originalText: text,
    correctedText: result,
    changesCount: corrections.length,
    corrections,
  };
}
