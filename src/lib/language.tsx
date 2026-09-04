"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "bn";

// Static UI copy. Keys are the exact English source strings used as t(text) call
// sites throughout the app. User-submitted report text (service, description,
// city) is intentionally NOT translated here — it is free text written by an
// anonymous submitter and must be shown exactly as entered.
const dictionary: Record<string, string> = {
  // Top strip / accessibility labels
  "ANONYMOUS BY DESIGN — NO ACCOUNT · COOKIELESS ANALYTICS · NO RAW IP STORED":
    "বেনামী নকশা — অ্যাকাউন্ট নেই · কুকিহীন অ্যানালিটিক্স · কাঁচা\u00a0আইপি রাখা হয় না",
  "Main navigation": "প্রধান নেভিগেশন",
  "Toggle navigation": "নেভিগেশন খুলুন/বন্ধ করুন",
  "Report filters": "রিপোর্ট ফিল্টার",
  "Search reports": "রিপোর্ট খুঁজুন",
  "Filter by department": "দপ্তর অনুযায়ী ফিল্টার করুন",
  "Sort reports": "রিপোর্ট সাজান",
  "Map of Bangladesh with division boundaries": "বিভাগীয় সীমানাসহ বাংলাদেশের মানচিত্র",

  // Header nav
  "REPORTS": "রিপোর্ট",
  "DATA": "ডেটা",
  "HOW IT WORKS": "যেভাবে কাজ করে",
  "PRIVACY": "গোপনীয়তা",
  "MEET THE TEAM": "আমাদের টিম",
  "SUPPORT": "সাপোর্ট",
  "PRESS": "প্রেস",
  "FEATURE REQUEST": "ফিচার অনুরোধ",
  "Reported": "রিপোর্ট হয়েছে",
  "REPORT A BRIBE →": "ঘুষের রিপোর্ট করুন →",
  "REPORT": "রিপোর্ট",

  // Hero
  "LIVE PUBLIC LEDGER": "লাইভ পাবলিক লেজার",
  "Someone asked": "কেউ চাইল",
  "for extra.": "বাড়তি টাকা।",
  "You remember": "কত চেয়েছিল,",
  "how much.": "মনে আছে।",
  "Put it": "এবার লিখে দিন",
  "on the record.": "খাতায়।",
  "Report a bribe →": "ঘুষের রিপোর্ট করুন →",
  "Browse reports": "রিপোর্ট দেখুন",
  "LATEST REPORT": "সাম্প্রতিক রিপোর্ট",
  "No reports yet": "এখনও কোনো রিপোর্ট নেই",
  "TOTAL AMOUNT REPORTED": "মোট রিপোর্ট করা পরিমাণ",
  "TOP DIVISIONS": "শীর্ষ বিভাগ",
  "Patterns become harder to ignore.": "প্যাটার্ন উপেক্ষা করা কঠিন হয়ে ওঠে।",
  "One story is an allegation. Many records reveal a system.":
    "একটি ঘটনা একটি অভিযোগ মাত্র। অনেক রেকর্ড একটি ব্যবস্থাকে উন্মোচন করে।",
  "HOW IT WORKS →": "যেভাবে কাজ করে →",

  // Live reports section
  "Live": "লাইভ",
  "reports.": "রিপোর্ট।",
  "Every entry is an unverified, crowdsourced allegation.":
    "প্রতিটি এন্ট্রি একটি অযাচাইকৃত, সম্মিলিতভাবে সংগৃহীত অভিযোগ।",
  "ALL OUTCOMES": "সব ফলাফল",
  "Search service or place": "সেবা বা স্থান খুঁজুন",
  "ALL DEPARTMENTS": "সব দপ্তর",
  "HOT": "জনপ্রিয়",
  "MOST CONFIRMED": "সর্বাধিক নিশ্চিত",
  "NEWEST": "সর্বশেষ",
  "HIGHEST AMOUNT": "সর্বোচ্চ পরিমাণ",
  "CARDS": "কার্ড",
  "TABLE": "টেবিল",
  "Loading ledger…": "লেজার লোড হচ্ছে…",
  "Live data is unavailable. Please try again shortly.":
    "লাইভ ডেটা এই মুহূর্তে অনুপলব্ধ। একটু পরে আবার চেষ্টা করুন।",
  "No reports match these filters.": "এই ফিল্টারের সাথে মিলে এমন কোনো রিপোর্ট নেই।",
  "DIVISION LEDGER": "বিভাগ লেজার",

  // Report card / table
  "Unverified": "অযাচাইকৃত",
  "SAVING…": "সংরক্ষণ হচ্ছে…",
  "✓ CONFIRMED": "✓ নিশ্চিত করা হয়েছে",
  "▲ CONFIRM THIS REPORT": "▲ এই রিপোর্ট নিশ্চিত করুন",
  "Confirmation failed. Please try again.": "নিশ্চিত করা যায়নি। আবার চেষ্টা করুন।",
  "DEPARTMENT / SERVICE": "দপ্তর / সেবা",
  "PLACE": "স্থান",
  "AMOUNT": "পরিমাণ",
  "OUTCOME": "ফলাফল",
  "FILED": "দাখিলের সময়",
  "Paid": "পরিশোধিত",
  "Refused": "প্রত্যাখ্যাত",
  "Demand pending": "দাবি মুলতুবি",

  // Transparency ledger
  "Transparency": "স্বচ্ছতা",
  "ledger.": "লেজার।",
  "See the range, distribution, outcomes, and reporting hotspots without letting one unusually large demand define the story.":
    "একটি অস্বাভাবিক বড় দাবি দিয়ে পুরো চিত্র নির্ধারণ না করে পরিসর, বণ্টন, ফলাফল ও রিপোর্টের ঘনত্ব দেখুন।",
  "PUBLIC REPORTS": "পাবলিক রিপোর্ট",
  "DIVISIONS ON LEDGER": "লেজারে থাকা বিভাগ",
  "LARGEST REPORTED DEMAND": "সর্বোচ্চ রিপোর্ট করা দাবি",
  "AVERAGE REPORTED DEMAND": "গড় রিপোর্ট করা দাবি",
  "Total reported amount divided by published reports.":
    "মোট রিপোর্ট করা অঙ্ককে প্রকাশিত রিপোর্টের সংখ্যা দিয়ে ভাগ করা হয়েছে।",
  "MOST REPORTED DIVISION": "সবচেয়ে বেশি রিপোর্ট হওয়া বিভাগ",
  "HOW TO READ THIS DATA": "এই ডেটা যেভাবে পড়বেন",
  "A distribution tells more than an average.": "গড়ের চেয়ে বণ্টন বেশি তথ্য দেয়।",
  "A few very large demands can pull an average upward. The bands below show how many reports fall into each practical price range, while the maximum marks the outer edge.":
    "কয়েকটি খুব বড় দাবি গড়কে ওপরে টেনে নিতে পারে। নিচের ভাগগুলো দেখায় ব্যবহারিক প্রতিটি অঙ্কের সীমায় কতটি রিপোর্ট আছে, আর সর্বোচ্চ অঙ্কটি বাইরের সীমা চিহ্নিত করে।",
  "AMOUNT DISTRIBUTION": "অঙ্কের বণ্টন",
  "How large were the reported demands?": "রিপোর্ট করা দাবিগুলো কত বড় ছিল?",
  "Count and share of all reports": "সব রিপোর্টের সংখ্যা ও অনুপাত",
  "৳1,000 or less": "৳১,০০০ বা কম",
  "৳1,001–৳5,000": "৳১,০০১–৳৫,০০০",
  "৳5,001–৳10,000": "৳৫,০০১–৳১০,০০০",
  "More than ৳10,000": "৳১০,০০০-এর বেশি",
  "REPORTED OUTCOMES": "রিপোর্ট করা ফলাফল",
  "What did people say they did?": "মানুষ কী করেছেন বলে জানিয়েছেন?",
  "Self-reported, not independently verified": "নিজেদের দেওয়া তথ্য; স্বাধীনভাবে যাচাই করা নয়",
  " of resolved reports say the demand was refused. Pending demands are excluded from this rate.":
    " সমাধান হওয়া রিপোর্টে দাবি প্রত্যাখ্যানের কথা বলা হয়েছে। মুলতুবি দাবি এই হার থেকে বাদ।",
  "DIVISION REGISTRY": "বিভাগ রেজিস্ট্রি",
  "DEPARTMENT REGISTRY": "দপ্তর রেজিস্ট্রি",
  "SHARE OF REPORTS": "রিপোর্টের অনুপাত",

  // How it works
  "How it works.": "যেভাবে কাজ করে।",
  "Three steps.": "তিনটি ধাপ।",
  "No account. No identity fields. No hidden fingerprint. Just a structured public allegation.":
    "কোনো অ্যাকাউন্ট নেই। কোনো পরিচয় ঘর নেই। কোনো লুকানো ফিঙ্গারপ্রিন্ট নেই। শুধু একটি কাঠামোবদ্ধ পাবলিক অভিযোগ।",
  "ANONYMOUS": "বেনামী",
  "Document the demand": "দাবিটি নথিভুক্ত করুন",
  "Choose a department, service, approximate place, amount, and outcome. Do not name an individual.":
    "একটি দপ্তর, সেবা, আনুমানিক স্থান, পরিমাণ এবং ফলাফল বেছে নিন। কোনো ব্যক্তির নাম উল্লেখ করবেন না।",
  "REVIEWED": "পর্যালোচিত",
  "Safety check before publishing": "প্রকাশের আগে নিরাপত্তা যাচাই",
  "Submissions are queued for moderation to remove personal information and obvious abuse.":
    "ব্যক্তিগত তথ্য এবং স্পষ্ট অপব্যবহার বাদ দিতে জমাগুলো মডারেশনের জন্য সারিবদ্ধ করা হয়।",
  "PUBLIC": "পাবলিক",
  "Patterns stay searchable": "প্যাটার্ন অনুসন্ধানযোগ্য থাকে",
  "Approved reports become public by division, department, amount, and outcome.":
    "অনুমোদিত রিপোর্টগুলো বিভাগ, দপ্তর, পরিমাণ এবং ফলাফল অনুযায়ী পাবলিক হয়ে যায়।",

  // Quotes section
  "Real services.": "প্রকৃত সেবা।",
  "Public patterns.": "পাবলিক প্যাটার্ন।",
  "Allegations are not findings of guilt. GhushSite is an awareness ledger, not an official complaint authority.":
    "অভিযোগ মানেই দোষী প্রমাণিত নয়। ঘুষসাইট একটি সচেতনতামূলক লেজার, কোনো সরকারি অভিযোগ কর্তৃপক্ষ নয়।",
  "ADD AN ANONYMOUS REPORT →": "একটি বেনামী রিপোর্ট যোগ করুন →",

  // FAQ
  "Questions.": "প্রশ্ন।",
  "Is my report really anonymous?": "আমার রিপোর্ট কি সত্যিই বেনামী?",
  "GhushSite asks for no account, name, email, phone number, or device identifier. The report table has no IP-address field. Infrastructure providers may still process network data to deliver the service.":
    "ঘুষসাইট কোনো অ্যাকাউন্ট, নাম, ইমেইল, ফোন নম্বর বা ডিভাইস আইডেন্টিফায়ার চায় না। রিপোর্ট টেবিলে কোনো আইপি-অ্যাড্রেস ঘর নেই। সেবা প্রদানের জন্য অবকাঠামো প্রদানকারীরা তবুও নেটওয়ার্ক ডেটা প্রক্রিয়া করতে পারে।",
  "Can I name the person who demanded money?": "যে ব্যক্তি টাকা দাবি করেছেন তার নাম কি আমি উল্লেখ করতে পারি?",
  "No. Report the department, service, place, amount, and circumstances. Naming an individual creates safety and legal risks and the report may be rejected.":
    "না। দপ্তর, সেবা, স্থান, পরিমাণ এবং পরিস্থিতি উল্লেখ করুন। কোনো ব্যক্তির নাম উল্লেখ করলে নিরাপত্তা ও আইনি ঝুঁকি তৈরি হয় এবং রিপোর্টটি প্রত্যাখ্যাত হতে পারে।",
  "Is this an official corruption complaint?": "এটি কি কোনো সরকারি দুর্নীতির অভিযোগ?",
  "No. GhushSite is a crowdsourced awareness ledger. If you need an investigation or legal remedy, contact the relevant anti-corruption authority.":
    "না। ঘুষসাইট একটি সম্মিলিতভাবে সংগৃহীত সচেতনতামূলক লেজার। তদন্ত বা আইনি প্রতিকার প্রয়োজন হলে সংশ্লিষ্ট দুর্নীতি দমন কর্তৃপক্ষের সাথে যোগাযোগ করুন।",

  // Creator purchases
  "CREATOR PAGES": "ক্রিয়েটর পেজ",
  "Like the work? Send a featured message.": "কাজটি ভালো লেগেছে? একটি ফিচার্ড মেসেজ পাঠান।",
  "VIEW CREATOR OPTIONS →": "ক্রিয়েটর অপশন দেখুন →",

  // Creator page
  "Choose a featured message": "একটি ফিচার্ড মেসেজ বেছে নিন",
  "or buy us a coffee.": "অথবা আমাদের এক কাপ কফি কিনে দিন।",
  "BANGLADESH · BDT": "বাংলাদেশ · টাকা",
  "Buy a featured message": "একটি ফিচার্ড মেসেজ কিনুন",
  "BUY A FEATURED MESSAGE →": "ফিচার্ড মেসেজ কিনুন →",
  "USD · GBP · EUR · CAD · AUD": "USD · GBP · EUR · CAD · AUD",
  "Buy us a coffee": "আমাদের এক কাপ কফি কিনে দিন",
  "BUY US A COFFEE →": "আমাদের এক কাপ কফি কিনে দিন →",
  "LINK COMING SOON": "লিংক শীঘ্রই আসছে",

  // Final CTA
  "Silence protects the pattern.": "নীরবতা প্যাটার্নকে রক্ষা করে।",
  "Public data breaks it.": "পাবলিক ডেটা তা ভেঙে দেয়।",
  "Takes under two minutes. No identity required.":
    "দুই মিনিটেরও কম সময় লাগে। কোনো পরিচয় প্রয়োজন নেই।",

  // Footer
  "Anonymous public-interest reporting.": "বেনামী জনস্বার্থমূলক রিপোর্টিং।",
  "PRIVACY & SAFETY": "গোপনীয়তা ও নিরাপত্তা",

  // Report form
  "← BACK TO REPORTS": "← রিপোর্টে ফিরে যান",
  "Report an alleged bribe.": "একটি অভিযুক্ত ঘুষের রিপোর্ট করুন।",
  "Anonymous. No account. No identity fields. Reviewed before publishing.":
    "বেনামী। কোনো অ্যাকাউন্ট নেই। কোনো পরিচয় ঘর নেই। প্রকাশের আগে পর্যালোচনা করা হয়।",
  "WE DO NOT ASK FOR OR STORE": "আমরা যা চাই না বা সংরক্ষণ করি না",
  "Name": "নাম",
  "Email": "ইমেইল",
  "Phone": "ফোন",
  "Raw IP address": "কাঁচা আইপি অ্যাড্রেস",
  "Device ID": "ডিভাইস আইডি",
  "CHECK THE REPORT": "রিপোর্টটি যাচাই করুন",
  "Complete every highlighted field before submitting the report.":
    "রিপোর্ট জমা দেওয়ার আগে হাইলাইট করা প্রতিটি ঘর পূরণ করুন।",
  "PUBLIC SERVICE": "সরকারি সেবা",
  "DEPARTMENT": "দপ্তর",
  "Select department": "দপ্তর নির্বাচন করুন",
  "SERVICE OR PROCESS": "সেবা বা প্রক্রিয়া",
  "e.g. trade licence renewal": "যেমন: ট্রেড লাইসেন্স নবায়ন",
  "APPROXIMATE LOCATION": "আনুমানিক অবস্থান",
  "CITY": "শহর",
  "City": "শহর",
  "DIVISION": "বিভাগ",
  "Select division": "বিভাগ নির্বাচন করুন",
  "Do not enter a home address, desk number, or a person’s name.":
    "বাসার ঠিকানা, ডেস্ক নম্বর বা কোনো ব্যক্তির নাম উল্লেখ করবেন না।",
  "THE DEMAND": "দাবিকৃত অর্থ",
  "AMOUNT (BDT)": "পরিমাণ (টাকা)",
  "WHAT HAPPENED?": "কী ঘটেছিল?",
  "I refused": "আমি প্রত্যাখ্যান করেছি",
  "I paid": "আমি পরিশোধ করেছি",
  "Demand is pending": "দাবি মুলতুবি আছে",
  "DESCRIPTION": "বিবরণ",
  "Describe the service, how the unofficial payment was requested, and what happened next. Do not include names, phone numbers, or identifying details.":
    "সেবাটি কী ছিল, অনানুষ্ঠানিক অর্থ কীভাবে দাবি করা হয়েছিল এবং এরপর কী হয়েছিল তা লিখুন। কোনো নাম, ফোন নম্বর বা শনাক্তকারী তথ্য উল্লেখ করবেন না।",
  "MODERATION NOTICE": "মডারেশন নোটিশ",
  "Your report will not appear immediately. A moderator will review and approve it before it is published.":
    "আপনার রিপোর্ট সাথে সাথে প্রকাশিত হবে না। প্রকাশের আগে একজন মডারেটর এটি পর্যালোচনা করে অনুমোদন করবেন।",
  "I have not named or identified a private individual. I understand this is a public, unverified allegation and not an official complaint.":
    "আমি কোনো ব্যক্তির নাম বা পরিচয় উল্লেখ করিনি। আমি বুঝি এটি একটি পাবলিক, অযাচাইকৃত অভিযোগ, কোনো সরকারি অভিযোগ নয়।",
  "SUBMITTING…": "জমা হচ্ছে…",
  "SUBMIT ANONYMOUS REPORT →": "বেনামী রিপোর্ট জমা দিন →",
  "Report received. A moderator will review and approve it before it appears publicly.":
    "রিপোর্ট গৃহীত হয়েছে। প্রকাশের আগে একজন মডারেটর এটি পর্যালোচনা করে অনুমোদন করবেন।",
  "The report could not be submitted. Please try again.":
    "রিপোর্টটি জমা দেওয়া যায়নি। আবার চেষ্টা করুন।",
  "Please take a moment to complete the report before submitting.":
    "রিপোর্ট জমা দেওয়ার আগে একটু সময় নিয়ে ফর্মটি পূরণ করুন।",
  "This form has expired. Refresh the page and try again.":
    "এই ফর্মের মেয়াদ শেষ হয়েছে। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।",
  "Complete every field with a valid value before submitting.":
    "জমা দেওয়ার আগে প্রতিটি ঘরে বৈধ তথ্য দিন।",
  "Remove names, addresses, contact details, links, and identifying numbers before submitting.":
    "জমা দেওয়ার আগে নাম, ঠিকানা, যোগাযোগের তথ্য, লিংক এবং শনাক্তকারী নম্বর সরিয়ে দিন।",
  "Too many requests. Please wait before trying again.":
    "অতিরিক্ত অনুরোধ করা হয়েছে। আবার চেষ্টা করার আগে অপেক্ষা করুন।",
  "Submission passes through GhushSite’s protected server endpoint and remains private until a moderator approves it.":
    "জমাটি ঘুষসাইটের সুরক্ষিত সার্ভার এন্ডপয়েন্টের মাধ্যমে যায় এবং মডারেটর অনুমোদন না দেওয়া পর্যন্ত ব্যক্তিগত থাকে।",

  // Privacy page
  "Collect the allegation.": "অভিযোগ সংগ্রহ করি।",
  "Not the person.": "ব্যক্তি নয়।",
  "What GhushSite stores": "ঘুষসাইট যা সংরক্ষণ করে",
  "GhushSite stores the report fields you submit and short-lived, rotating HMAC abuse-prevention keys in a separate private table. Those keys are not attached to report content.":
    "ঘুষসাইট আপনার জমা দেওয়া রিপোর্টের ঘরগুলো এবং স্বল্পমেয়াদি, ঘূর্ণায়মান HMAC অপব্যবহার-প্রতিরোধ কী আলাদা একটি ব্যক্তিগত টেবিলে সংরক্ষণ করে। কীগুলো রিপোর্টের বিষয়বস্তুর সাথে যুক্ত নয়।",
  "Optional third-party services": "ঐচ্ছিক তৃতীয় পক্ষের সেবা",
  "Analytics and support widgets are disabled by default. A deployment operator may enable them with public environment variables and must disclose the resulting network processing in its own privacy notice.":
    "অ্যানালিটিক্স ও সাপোর্ট উইজেট ডিফল্টভাবে বন্ধ থাকে। কোনো ডেপ্লয়মেন্ট অপারেটর পাবলিক এনভায়রনমেন্ট ভেরিয়েবল দিয়ে এগুলো চালু করলে, সংশ্লিষ্ট নেটওয়ার্ক ডেটা প্রক্রিয়াকরণ নিজস্ব গোপনীয়তা নোটিশে জানাতে হবে।",
  "What GhushSite does not store": "ঘুষসাইট যা সংরক্ষণ করে না",
  "No name, account, email, phone number, exact home address, raw IP-address column, analytics cookies, ad identifier, or device fingerprint.":
    "কোনো নাম, অ্যাকাউন্ট, ইমেইল, ফোন নম্বর, সঠিক বাসার ঠিকানা, কাঁচা আইপি-অ্যাড্রেস কলাম, অ্যানালিটিক্স কুকি, বিজ্ঞাপন আইডেন্টিফায়ার বা ডিভাইস ফিঙ্গারপ্রিন্ট নয়।",
  "Infrastructure reality": "অবকাঠামোগত বাস্তবতা",
  "The hosting platform or a trusted reverse proxy briefly processes the request IP to derive a one-way, rotating rate-limit key. GhushSite never writes the raw address to Supabase or uses it to profile visitors.":
    "এক-মুখী, ঘূর্ণায়মান রেট-লিমিট কী তৈরি করতে হোস্টিং প্ল্যাটফর্ম বা বিশ্বস্ত রিভার্স প্রক্সি অনুরোধের আইপি সংক্ষেপে প্রক্রিয়া করে। ঘুষসাইট কাঁচা ঠিকানাটি কখনো Supabase-এ লেখে না বা ভিজিটরদের প্রোফাইল তৈরিতে ব্যবহার করে না।",
  "Safety rules": "নিরাপত্তা নিয়মাবলী",
  "Reports must describe systems and services, not identify alleged individuals. Every submission is an unverified allegation and is queued for moderation before publication.":
    "রিপোর্টে অবশ্যই ব্যবস্থা ও সেবার বর্ণনা থাকতে হবে, কোনো ব্যক্তিকে চিহ্নিত করা যাবে না। প্রতিটি জমা একটি অযাচাইকৃত অভিযোগ এবং প্রকাশের আগে মডারেশনের জন্য সারিবদ্ধ থাকে।",

  // Controlled vocabulary: departments (matches src/lib/report-model.ts)
  "Land Office": "ভূমি অফিস",
  "Accounts Office": "হিসাবরক্ষণ অফিস",
  "Tax Office": "কর অফিস",
  "Customs Office": "কাস্টমস অফিস",
  "Traffic Police": "ট্রাফিক পুলিশ",
  "BRTA": "বিআরটিএ",
  "Passport Office": "পাসপোর্ট অফিস",
  "City Corporation": "সিটি কর্পোরেশন",
  "Sub-Registry Office": "সাব-রেজিস্ট্রি অফিস",
  "Education Office": "শিক্ষা অফিস",
  "Public Hospital": "সরকারি হাসপাতাল",
  "Other public service": "অন্যান্য সরকারি সেবা",

  // Controlled vocabulary: divisions (matches the 8 division/"district" options)
  "Barishal": "বরিশাল",
  "Chattogram": "চট্টগ্রাম",
  "Dhaka": "ঢাকা",
  "Khulna": "খুলনা",
  "Mymensingh": "ময়মনসিংহ",
  "Rajshahi": "রাজশাহী",
  "Rangpur": "রংপুর",
  "Sylhet": "সিলেট",

  // Dynamic-suffix helpers (attached directly after a number, no extra space
  // added — see usages like `{count}{t(" REPORTS")}`)
  " REPORTS": "টি রিপোর্ট",
  " reports": "টি রিপোর্ট",
  " DIVISIONS": "টি বিভাগ",
  "% of resolved demands refused": "% নিষ্পত্তি হওয়া দাবি প্রত্যাখ্যাত",
  "Switch language": "ভাষা পরিবর্তন করুন",

  // Team page
  "The people behind": "যাদের হাতে গড়া",
  "the ledger.": "এই লেজার।",
  "FOUNDER": "প্রতিষ্ঠাতা",
  "CO-FOUNDER": "সহ-প্রতিষ্ঠাতা",
  "Full-stack developer, 18. Builds and moderates GhushSite between A Level classes. Product engineer at DeliveryHobe and co-founder of AvanzaWorks.":
    "ফুল-স্ট্যাক ডেভেলপার, ১৮। A Level ক্লাসের ফাঁকে GhushSite তৈরি ও মডারেট করেন। DeliveryHobe-এর প্রোডাক্ট ইঞ্জিনিয়ার ও AvanzaWorks-এর সহ-প্রতিষ্ঠাতা।",
  "Brought GhushSite its first readers. Runs GM Studios and SaaSMotionDesign at 23, while finishing a CS and Marketing double major at BRAC University.":
    "GhushSite-এর প্রথম পাঠক এনে দিয়েছেন। ২৩ বছর বয়সে GM Studios ও SaaSMotionDesign পরিচালনা করছেন, পাশাপাশি BRAC University-তে CS ও মার্কেটিং-এ ডাবল মেজর শেষ করছেন।",
};

export function translate(text: string, language: Language): string {
  if (language === "en") return text;
  return dictionary[text] ?? text;
}

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

export function localizeDigits(value: string | number, language: Language): string {
  const text = String(value);
  if (language !== "bn") return text;
  return text.replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)]);
}

type LanguageContextValue = {
  language: Language;
  toggleLanguage: () => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "ghushsite-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("bn");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: Language = saved === "en" ? "en" : "bn";
    const frame = window.requestAnimationFrame(() => setLanguage(initial));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next: Language = current === "en" ? "bn" : "en";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const t = (text: string) => translate(text, language);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
