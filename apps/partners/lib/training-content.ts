/*
 * The Referral Partner course. Content only — the page in
 * app/(dashboard)/training renders it.
 *
 * Kept as data rather than JSX because it is written and corrected by people
 * who should not have to touch markup, and because every lesson is built from
 * the same five blocks. Add a block kind only when a lesson genuinely cannot
 * be said with the existing five.
 *
 * Accuracy rules for anyone editing this file:
 *   - Statuses, form fields and product names must match what the partner
 *     actually sees. They come from @truelend/reference; if a slug or a status
 *     changes there, fix the lesson that names it.
 *   - Every rupee figure here is INDICATIVE and must be labelled as such. The
 *     lender decides the real number per case, and a partner quoting this file
 *     as a promise is exactly the behaviour Module 9 forbids.
 *   - No incentive percentage appears anywhere. TrueLend does not publish one,
 *     so neither does the training.
 */

export type Block =
  | { kind: "text"; body: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "table"; head: string[]; rows: string[][]; caption?: string }
  | { kind: "callout"; tone: "do" | "dont" | "note"; title: string; body: string }
  | { kind: "script"; title: string; lines: { who: string; say: string }[] };

export interface Lesson {
  title: string;
  blocks: Block[];
}

export interface TrainingModule {
  slug: string;
  title: string;
  minutes: number;
  summary: string;
  outcomes: string[];
  lessons: Lesson[];
}

export const trainingModules: TrainingModule[] = [
  {
    slug: "the-role",
    title: "What this job actually is",
    minutes: 5,
    summary:
      "Before any loan theory: what a Referral Partner does, what TrueLend does, and where the money comes from.",
    outcomes: [
      "Explain your role to a stranger in thirty seconds",
      "Name the four things you do and the five you must never do",
      "Describe the full journey from introduction to disbursal",
    ],
    lessons: [
      {
        title: "Your role in one line",
        blocks: [
          {
            kind: "text",
            body: "You introduce a person who needs a loan. TrueLend’s advisors do everything after that — verifying details, choosing the lender, collecting documents, chasing the file and getting it disbursed. You are not a lender, you are not an employee or agent of any bank, and you never touch the customer’s money or documents.",
          },
          {
            kind: "text",
            body: "That is the whole job. It sounds small, and it is the part that is genuinely hard to buy: banks can advertise, but they cannot manufacture a person who already trusts you.",
          },
          {
            kind: "list",
            ordered: true,
            items: [
              "Notice someone with a real, current borrowing need.",
              "Ask their permission to pass their details to TrueLend.",
              "Submit the referral with correct details and useful context.",
              "Hand over, then watch the status instead of chasing the customer.",
            ],
          },
          {
            kind: "callout",
            tone: "dont",
            title: "Five things that are never part of this role",
            body: "Taking any money or fee from a customer. Promising an approval, a rate or an amount. Filling in, arranging or altering anyone’s documents. Collecting or storing a customer’s KYC files yourself. Contacting a bank or lender on the customer’s behalf.",
          },
        ],
      },
      {
        title: "The journey, end to end",
        blocks: [
          {
            kind: "text",
            body: "Every referral you submit moves through the same stages. These are the exact labels you will see on the Referral Status page, so learn them once and you can read any file at a glance.",
          },
          {
            kind: "table",
            head: ["Stage", "Who is working", "What is happening"],
            rows: [
              ["New", "TrueLend", "Your referral has landed and is queued for a call."],
              [
                "Contacted",
                "TrueLend",
                "An advisor has spoken to the customer and is confirming the need.",
              ],
              [
                "Qualified",
                "TrueLend",
                "Income, obligations and credit history look workable for a lender.",
              ],
              [
                "Docs Collected",
                "Customer + TrueLend",
                "KYC, income and (if secured) property or business papers are in.",
              ],
              ["Logged In", "Lender", "The file has been formally submitted to a bank or NBFC."],
              [
                "Approved",
                "Lender",
                "Sanctioned — the lender has agreed an amount, rate and tenure.",
              ],
              [
                "Disbursed",
                "Lender",
                "Money has actually reached the customer. This is the finish line.",
              ],
              ["Declined", "Lender", "This lender said no. TrueLend may still try another lender."],
              ["Lost", "—", "The customer stopped responding or no longer wants the loan."],
            ],
          },
          {
            kind: "text",
            body: "Typical end-to-end timelines, when the customer cooperates: a personal loan or credit card takes days; a business loan two to four weeks; a home loan or loan against property four to eight weeks, because a property has to be valued and legally checked. A file that goes quiet is almost always waiting on one missing document.",
          },
          {
            kind: "callout",
            tone: "note",
            title: "Sanctioned is not disbursed",
            body: "Approved means the lender has agreed on paper. Disbursed means the money moved. Files die between those two stages more often than anywhere else — usually because the customer changed their mind or could not complete a condition. Never celebrate at Approved.",
          },
        ],
      },
      {
        title: "Where your income comes from",
        blocks: [
          {
            kind: "text",
            body: "An eligible incentive is recorded in your dashboard after a referred borrower’s loan is successfully disbursed and verified by the TrueLend team. Not at referral, not at approval — at verified disbursal.",
          },
          {
            kind: "table",
            head: ["On the Rewards page", "What it means"],
            rows: [
              ["Incentive earned", "Everything recorded in your favour so far."],
              ["Received", "What has already been paid out to you."],
              ["Balance", "Earned minus received — what is still due."],
            ],
          },
          {
            kind: "text",
            body: "The amount depends on the product, the lender and the size of the case, and it is confirmed by the TrueLend team — there is no fixed published rate, so never quote one to a customer or to another partner. Joining costs nothing, there is no target, and no one at TrueLend will ever ask you to pay to unlock a payout.",
          },
          {
            kind: "callout",
            tone: "note",
            title: "The customer never pays you",
            body: "Intermediary income comes from the lender, not the borrower. If someone asks “so what do you get out of this?”, answer plainly: “The lender pays TrueLend when a loan is disbursed, and I get a share of that. It costs you nothing.” Honesty here wins more referrals than a dodge ever will.",
          },
        ],
      },
    ],
  },

  {
    slug: "loan-language",
    title: "Loan language from zero",
    minutes: 12,
    summary:
      "The vocabulary on every sanction letter, how an EMI is actually calculated, and the flat-rate trick that fools most borrowers.",
    outcomes: [
      "Define every term a customer or lender will use in front of you",
      "Work out an EMI on paper and sanity-check anyone’s numbers",
      "Explain why a “10% flat” offer is worse than an 11% bank loan",
    ],
    lessons: [
      {
        title: "The words you must know",
        blocks: [
          {
            kind: "table",
            head: ["Term", "What it means", "Why you care"],
            rows: [
              [
                "Principal",
                "The amount borrowed, before any interest.",
                "Every other number is derived from it.",
              ],
              [
                "Interest rate (p.a.)",
                "Yearly cost of the loan, as a percentage.",
                "Always ask “per annum or per month?” — cards quote per month.",
              ],
              [
                "Reducing balance",
                "Interest charged only on the outstanding amount, which falls every month.",
                "This is how genuine bank and NBFC loans work.",
              ],
              [
                "Flat rate",
                "Interest charged on the full original amount for the whole tenure.",
                "Looks cheap, costs roughly double. See the next lesson.",
              ],
              [
                "EMI",
                "Equated Monthly Instalment — the fixed monthly payment.",
                "The only number most customers actually care about.",
              ],
              [
                "Tenure",
                "How many months the loan runs.",
                "Longer tenure, smaller EMI, more total interest.",
              ],
              [
                "Processing fee",
                "One-time charge, often 0.5–2% of the loan, usually deducted from the disbursal.",
                "Customers feel cheated if nobody warned them it is deducted.",
              ],
              [
                "Foreclosure / prepayment charge",
                "Penalty for closing the loan early.",
                "Floating-rate home loans to individuals generally have none; personal loans often do.",
              ],
              [
                "Part-payment",
                "Paying a lump sum into the loan without closing it.",
                "Reduces either the EMI or the tenure — the customer chooses.",
              ],
              [
                "LTV (loan to value)",
                "How much a lender will lend against an asset’s value.",
                "Home loan up to ~90%; loan against property usually 50–70%.",
              ],
              [
                "Obligations / FOIR",
                "Existing monthly EMIs as a share of income.",
                "The single most common reason a decent-looking file is rejected.",
              ],
              [
                "CIBIL score",
                "Credit score from 300 to 900 based on repayment history.",
                "Below ~700, options narrow fast and rates climb.",
              ],
              [
                "Secured / unsecured",
                "Backed by an asset, or not.",
                "Secured is cheaper and slower; unsecured is costlier and quicker.",
              ],
              [
                "Co-applicant",
                "Joint borrower whose income is added and who is equally liable.",
                "The standard fix for a shortfall in eligibility.",
              ],
              [
                "Guarantor",
                "Someone liable if the borrower defaults, but with no claim on the money.",
                "Never suggest this casually — it is a real liability for a friend.",
              ],
              [
                "Sanction letter",
                "The lender’s written offer: amount, rate, tenure, conditions.",
                "Read the conditions; disbursal depends on them.",
              ],
              [
                "Disbursal",
                "The money actually leaving the lender.",
                "The stage your incentive depends on.",
              ],
              [
                "Moratorium",
                "An agreed pause before repayment starts.",
                "Standard on education loans during the course.",
              ],
              [
                "Balance transfer",
                "Moving an existing loan to a cheaper lender.",
                "A whole referral category on its own — see Module 6.",
              ],
              [
                "Top-up",
                "Extra loan on top of a running one, at near the same rate.",
                "Often cheaper than a fresh personal loan.",
              ],
              [
                "NBFC",
                "A non-bank lender, regulated by the RBI but not a bank.",
                "Usually more flexible on profile, usually costlier.",
              ],
            ],
          },
        ],
      },
      {
        title: "How an EMI is actually calculated",
        blocks: [
          {
            kind: "text",
            body: "EMI = P × r × (1+r)ⁿ ÷ ((1+r)ⁿ − 1), where P is the principal, n is the number of months, and r is the monthly rate — the annual rate divided by 12, then by 100. For 12% per annum, r = 0.01.",
          },
          {
            kind: "text",
            body: "Worked example. A ₹5,00,000 personal loan at 12% p.a. for 36 months: r = 0.01, n = 36, and the EMI comes to about ₹16,607. Over three years that is roughly ₹5,98,000 repaid — about ₹98,000 of interest on a ₹5 lakh loan.",
          },
          {
            kind: "text",
            body: "Now a ₹50,00,000 home loan at 8.5% p.a. for 20 years: the EMI is about ₹43,400, and the total repaid is about ₹1.04 crore. The customer pays more in interest than they borrowed. That is not a scam — it is what twenty years of money costs — but it is the number that makes people take a shorter tenure or part-pay early, and telling them honestly is why they will send you their brother next year.",
          },
          {
            kind: "callout",
            tone: "do",
            title: "The rule of thumb worth memorising",
            body: "Every ₹1 lakh of home loan at around 8.5% costs roughly ₹870 a month over 20 years, or roughly ₹1,240 a month over 10 years. You can now estimate any home loan EMI in your head, in front of the customer, without a calculator.",
          },
        ],
      },
      {
        title: "Flat rate versus reducing rate — the trap",
        blocks: [
          {
            kind: "text",
            body: "A reducing-balance loan charges interest only on what is still outstanding, which falls with every EMI. A flat-rate loan charges interest on the entire original amount for the entire tenure, even in the last month when almost nothing is left.",
          },
          {
            kind: "text",
            body: "Take ₹5,00,000 for 3 years at “10% flat”. Interest is 5,00,000 × 10% × 3 = ₹1,50,000, so the customer repays ₹6,50,000, i.e. an EMI of about ₹18,056. To have that same EMI on a proper reducing-balance loan, the rate would have to be roughly 18% per annum. So a “10% flat” offer is nearly twice as expensive as an 11% bank loan, and the customer thinks they are saving.",
          },
          {
            kind: "callout",
            tone: "do",
            title: "One question that protects the customer",
            body: "When someone says “another agent is offering me 10%”, ask: “Is that flat or reducing?” Most cannot answer. That single question is often the moment they decide to work with you instead.",
          },
        ],
      },
      {
        title: "Bank or NBFC?",
        blocks: [
          {
            kind: "table",
            head: ["", "Bank", "NBFC"],
            rows: [
              ["Interest rate", "Usually lower", "Usually higher"],
              [
                "Profile flexibility",
                "Strict — clean credit, documented income",
                "Flexible — cash income, thin credit, past issues",
              ],
              ["Speed", "Slower, more checks", "Faster, fewer counters"],
              [
                "Best for",
                "Salaried, salaried-plus-property, clean CIBIL",
                "Self-employed, urgent need, imperfect history",
              ],
            ],
          },
          {
            kind: "text",
            body: "Neither is better in the abstract. Choosing between them for a specific customer is TrueLend’s job, not yours — but knowing the difference stops you from telling a self-employed shopkeeper with a 690 score that “the bank will definitely do it”.",
          },
        ],
      },
    ],
  },

  {
    slug: "products",
    title: "The nine products, and who needs them",
    minutes: 15,
    summary:
      "Every product TrueLend covers: who it suits, what a lender checks, and the sentence in ordinary conversation that tells you a referral is sitting in front of you.",
    outcomes: [
      "Match any borrowing need to the right product in one step",
      "Know what a lender looks at first for each product",
      "Recognise a referral from what people say in passing",
    ],
    lessons: [
      {
        title: "The catalogue at a glance",
        blocks: [
          {
            kind: "table",
            caption:
              "Indicative only. The lender decides the actual amount, rate and tenure for every case — never present these as an offer.",
            head: ["Product", "Who it is for", "Typical amount", "Typical tenure", "Secured?"],
            rows: [
              [
                "Home Loan",
                "Buying, building or transferring a home",
                "₹5 L – ₹5 Cr",
                "Up to 30 years",
                "Yes — the property",
              ],
              [
                "Loan Against Property",
                "Owns property, needs a large sum for any purpose",
                "₹5 L – ₹5 Cr",
                "Up to 15 years",
                "Yes — the property",
              ],
              [
                "Business Loan",
                "MSME needing expansion or a term loan",
                "₹50 K – ₹75 L",
                "1 – 5 years",
                "Often unsecured",
              ],
              [
                "Personal Loan",
                "Salaried, needs money quickly for anything",
                "₹10 K – ₹40 L",
                "1 – 6 years",
                "No",
              ],
              [
                "Vehicle Loan",
                "Buying a car, two-wheeler or commercial vehicle",
                "₹1 L – ₹1 Cr",
                "1 – 7 years",
                "Yes — the vehicle",
              ],
              [
                "Education Loan",
                "Student going to a recognised institution",
                "₹1 L – ₹1.5 Cr",
                "Up to 15 years",
                "Above ~₹7.5 L, usually",
              ],
              [
                "Working Capital",
                "Business with a cash-flow gap between billing and payment",
                "₹5 L – ₹5 Cr",
                "12 months, renewable",
                "Usually",
              ],
              [
                "Equipment Finance",
                "Buying machinery, medical or commercial equipment",
                "₹1 L – ₹5 Cr",
                "1 – 7 years",
                "Yes — the equipment",
              ],
              [
                "Credit Cards",
                "Anyone with steady income and reasonable credit",
                "Limit ₹10 K upward",
                "Revolving",
                "No",
              ],
            ],
          },
          {
            kind: "text",
            body: "Two of these behave unlike the rest. Working capital is usually an overdraft or cash-credit limit, where interest is charged only on the amount actually used — a business with a ₹50 lakh limit that draws ₹8 lakh pays interest on ₹8 lakh. Credit cards quote interest per month, not per year: 3.5% per month is about 42% a year, which is why revolving a balance is the most expensive borrowing an ordinary person can do.",
          },
        ],
      },
      {
        title: "What the lender looks at first",
        blocks: [
          {
            kind: "table",
            head: ["Product", "The first thing that gets checked", "The usual reason it fails"],
            rows: [
              [
                "Home Loan",
                "Property title and approvals, then income",
                "Legal issues in the property chain, or FOIR too high",
              ],
              [
                "Loan Against Property",
                "Market value and marketability of the property",
                "Property is disputed, tenanted, or agricultural",
              ],
              [
                "Business Loan",
                "Business vintage, bank statements, ITR and GST",
                "Under 2–3 years old, or turnover not visible in the bank account",
              ],
              [
                "Personal Loan",
                "CIBIL score and existing EMIs",
                "Score below ~720, or too many recent loan enquiries",
              ],
              [
                "Vehicle Loan",
                "The vehicle, the dealer, then the borrower",
                "Older used vehicle than the lender will fund",
              ],
              [
                "Education Loan",
                "The institution and course, then the co-applicant",
                "Unrecognised institution, or a co-applicant with weak income",
              ],
              [
                "Working Capital",
                "Cash-flow cycle in the bank statement",
                "Debtor cycle far longer than the business claims",
              ],
              [
                "Equipment Finance",
                "Quotation from the supplier and its resale value",
                "Second-hand or highly specialised equipment",
              ],
              [
                "Credit Cards",
                "CIBIL score and income proof",
                "Thin credit file, or several cards already open",
              ],
            ],
          },
        ],
      },
      {
        title: "Listen for these sentences",
        blocks: [
          {
            kind: "text",
            body: "Referrals almost never announce themselves as referrals. They arrive as ordinary complaints and plans. These are the ones worth hearing.",
          },
          {
            kind: "list",
            items: [
              "“We’ve booked the flat, registration is next month.” — Home Loan.",
              "“I need funds for the business but I don’t want to sell the shop.” — Loan Against Property.",
              "“Payments from my client are stuck for 90 days.” — Working Capital.",
              "“I’m paying four different EMIs, it’s a mess.” — Personal Loan for debt consolidation.",
              "“My daughter got admission abroad in September.” — Education Loan, and start early.",
              "“Business is good, I just can’t afford the second machine.” — Equipment Finance.",
              "“I’m paying 9.6% on my home loan from before.” — Balance transfer, plus a top-up.",
              "“My card bill is huge, I’m paying minimum due every month.” — Personal Loan at a third of the cost.",
              "“The dealer’s finance guy quoted me something odd.” — Vehicle Loan, and check flat versus reducing.",
            ],
          },
          {
            kind: "callout",
            tone: "do",
            title: "The highest-value referral most partners miss",
            body: "Anyone paying an old home loan at a rate well above today’s. A balance transfer can cut a 20-year EMI by thousands of rupees a month and often carries a top-up for the customer’s other needs. Ask everyone you know with a home loan what rate they are paying. Most do not know — which is exactly the point.",
          },
        ],
      },
    ],
  },

  {
    slug: "eligibility",
    title: "Will they qualify?",
    minutes: 10,
    summary:
      "The five gates every file passes through, how to estimate eligibility on the back of an envelope, and the red flags that sink a case before it starts.",
    outcomes: [
      "Estimate roughly how much someone can borrow before you refer them",
      "Read a CIBIL band and know what it does to the options",
      "Spot the profiles that need a co-applicant or a different product",
    ],
    lessons: [
      {
        title: "The five gates",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              "Identity and age — usually 21 to 60 for salaried at loan maturity, up to 65–70 for self-employed.",
              "Income — enough, documented, and arriving in a bank account rather than in cash.",
              "Obligations — existing EMIs must leave room for the new one. This is FOIR.",
              "Credit history — how they have repaid in the past, summarised as the CIBIL score.",
              "Security or end-use — for secured loans, an asset the lender is willing to hold.",
            ],
          },
          {
            kind: "text",
            body: "A file needs all five. Strength in one does not cover a failure in another: a ₹4 lakh monthly income does not rescue a 620 score, and a spotless score does not rescue a property with a broken title.",
          },
        ],
      },
      {
        title: "CIBIL, in plain terms",
        blocks: [
          {
            kind: "text",
            body: "The score runs from 300 to 900 and is built mostly from repayment history and how much of the available credit is being used. Missing EMIs hurts most. Using nearly all of a credit card limit every month hurts more than people expect. Applying to several lenders in quick succession also drags it down, which is one more reason not to let a customer scatter applications around.",
          },
          {
            kind: "table",
            head: ["Band", "What it means in practice"],
            rows: [
              ["750 and above", "Most lenders available, best rates, quickest decisions."],
              ["700 – 749", "Workable. Expect a slightly higher rate or a smaller amount."],
              ["650 – 699", "Bank options narrow. NBFCs likely, at a cost."],
              [
                "Below 650",
                "Unsecured is unlikely. A secured loan or a co-applicant is the honest route.",
              ],
              [
                "“-1” or “NH”",
                "No credit history at all. Not a bad score — it just needs a lender comfortable with new-to-credit.",
              ],
            ],
          },
          {
            kind: "callout",
            tone: "dont",
            title: "Never say you can fix a score",
            body: "Nobody can edit a credit report except the lender who reported the entry, and only to correct a genuine error. Anyone claiming otherwise is running a scam. The honest advice is real and useful: pay every EMI on time, bring card usage below a third of the limit, do not apply everywhere at once, and check back in six months.",
          },
        ],
      },
      {
        title: "Estimating eligibility on the back of an envelope",
        blocks: [
          {
            kind: "text",
            body: "Lenders cap total EMIs at roughly 50–55% of net monthly income — the FOIR. Work it out in three steps: take 55% of net income, subtract every EMI already running, and what is left is the EMI the customer can support.",
          },
          {
            kind: "text",
            body: "Example. Net salary ₹60,000, existing EMIs ₹12,000. 55% of ₹60,000 is ₹33,000; minus ₹12,000 leaves about ₹21,000 of EMI capacity. At around 11% per annum over 5 years, an EMI of ₹21,000 supports a loan of roughly ₹9.5 lakh. That is your ballpark — the lender may land higher or lower depending on the profile.",
          },
          {
            kind: "callout",
            tone: "note",
            title: "Say “roughly”, and mean it",
            body: "This estimate is for deciding whether a conversation is worth having, not for quoting to the customer. The correct sentence is “based on what you’ve told me, something in this range looks possible — the TrueLend team will confirm properly.” Never turn an estimate into a promise.",
          },
        ],
      },
      {
        title: "Salaried versus self-employed",
        blocks: [
          {
            kind: "table",
            head: ["", "Salaried", "Self-employed"],
            rows: [
              [
                "Income judged on",
                "Salary slips and salary credits in the bank",
                "ITR, computation of income, and bank statements",
              ],
              [
                "Stability judged on",
                "Time in the current job and total experience",
                "Business vintage, usually 2–3 years minimum",
              ],
              [
                "Common blocker",
                "Salary partly paid in cash",
                "Income shown low in the ITR to save tax",
              ],
              [
                "Fastest product",
                "Personal loan, credit card",
                "Loan against property, working capital",
              ],
            ],
          },
          {
            kind: "text",
            body: "The tax problem is worth understanding, because you will meet it constantly. A businessman earning ₹2 lakh a month who declares ₹4 lakh a year on his ITR will be assessed on the ₹4 lakh. He is not lying to you and you are not going to fix it — you simply route him towards products judged on banking turnover or on an asset instead.",
          },
        ],
      },
      {
        title: "Red flags to raise before you refer",
        blocks: [
          {
            kind: "list",
            items: [
              "EMI or cheque bounces in the last six months of bank statements.",
              "A loan settled or written off in the past — it sits on the report for years.",
              "Five or more loan enquiries in the last month; the customer has been shopping everywhere.",
              "Income entirely in cash, with a bank account that shows almost nothing.",
              "The customer is in a hurry because someone else has already rejected them and did not say why.",
              "Property that is agricultural, disputed, tenanted, or held on a power of attorney.",
              "Anyone asking whether documents can be “arranged” or “managed”.",
            ],
          },
          {
            kind: "text",
            body: "None of the first six mean “do not refer”. They mean “mention it in the referral note”, so an advisor picks the right lender on the first attempt instead of burning a rejection. The last one means stop — see Module 9.",
          },
        ],
      },
    ],
  },

  {
    slug: "documents",
    title: "Documents — what is needed, and your hands-off rule",
    minutes: 6,
    summary:
      "The paperwork every file needs, so you can set expectations early — and the firm line about who is allowed to hold it.",
    outcomes: [
      "Tell a customer what to keep ready before the first call",
      "Know why the list is longer for self-employed and for property",
      "Apply the rule on customer documents without exception",
    ],
    lessons: [
      {
        title: "The standard list",
        blocks: [
          {
            kind: "table",
            head: ["Category", "Salaried", "Self-employed"],
            rows: [
              [
                "Identity and address",
                "PAN (mandatory), Aadhaar, photograph",
                "PAN (mandatory), Aadhaar, photograph",
              ],
              [
                "Income",
                "Last 3 months’ salary slips, Form 16",
                "Last 2–3 years’ ITR with computation, audited financials if applicable",
              ],
              [
                "Banking",
                "Last 6 months’ salary account statement",
                "Last 12 months’ current account statement",
              ],
              [
                "Business proof",
                "—",
                "GST returns, Udyam/MSME certificate, registration or trade licence",
              ],
              [
                "Property (secured loans)",
                "Sale deed, prior chain of documents, approved plan, encumbrance certificate, latest tax receipt",
                "Same",
              ],
              ["Existing loans", "Sanction letter and repayment track of running loans", "Same"],
            ],
          },
          {
            kind: "text",
            body: "Two practical notes. PAN is non-negotiable for any credit product in India. And the bank statement is the single most informative document in the file — it shows income, EMIs, bounces and cash-flow behaviour at once, which is why lenders ask for it before anything else.",
          },
        ],
      },
      {
        title: "The rule you never bend",
        blocks: [
          {
            kind: "callout",
            tone: "dont",
            title: "You do not collect customer documents",
            body: "Do not ask for them, do not photograph them, do not keep them on your phone, and never email or WhatsApp them to anyone — including to TrueLend. The TrueLend team collects documents directly from the customer over a secure channel. The KYC page in your dashboard is for your own verification documents only.",
          },
          {
            kind: "text",
            body: "This is not bureaucracy. A customer’s Aadhaar and bank statement sitting in your phone’s gallery is a genuine risk to them and a liability for you, and Indian data-protection law treats personal data you were merely passed along as your responsibility once you hold it. Telling the customer “the team will collect everything directly, I don’t handle your documents” also makes you sound more professional, not less.",
          },
          {
            kind: "callout",
            tone: "do",
            title: "What you can helpfully say",
            body: "“Before the call, keep your PAN, Aadhaar, last three salary slips and six months of bank statements handy — it saves about a week.” Setting expectations is useful. Holding the files is not your job.",
          },
        ],
      },
    ],
  },

  {
    slug: "finding-referrals",
    title: "Finding referrals in the circle you already have",
    minutes: 8,
    summary:
      "Where the introductions actually come from, the five questions that qualify one in two minutes, and how to ask for consent without it feeling strange.",
    outcomes: [
      "Identify the referrals sitting inside your existing profession and network",
      "Qualify a lead in a two-minute conversation",
      "Ask for consent in words you are comfortable saying out loud",
    ],
    lessons: [
      {
        title: "Start where you already stand",
        blocks: [
          {
            kind: "text",
            body: "You do not need a new audience. Whatever you already do puts you next to people at the exact moment a borrowing need appears.",
          },
          {
            kind: "table",
            head: ["If you are a…", "The referral in front of you"],
            rows: [
              [
                "Real estate professional or builder",
                "Home loan for every buyer; loan against property for sellers holding stock",
              ],
              [
                "Chartered accountant",
                "Business loan, working capital, equipment finance for your clients",
              ],
              [
                "Insurance or financial advisor",
                "Everything — you already discuss money and family goals",
              ],
              ["Loan advisor or DSA", "Products your current lenders decline or do not offer"],
              ["Vehicle dealer", "Vehicle loans, and personal loans for the down payment"],
              [
                "HR professional",
                "Personal loans and credit cards for staff, especially before appraisal season",
              ],
              [
                "Educator or education consultant",
                "Education loans — start in the admissions season, not after",
              ],
              [
                "Doctor or medical professional",
                "Equipment finance and practice expansion loans for peers",
              ],
              [
                "Architect or interior designer",
                "Home improvement, loan against property, top-ups",
              ],
              ["Lawyer", "Loan against property and business loans through client work"],
              [
                "Community or salaried referrer",
                "Personal loans, cards, and the home loan everyone in the family talks about",
              ],
            ],
          },
          {
            kind: "text",
            body: "A rhythm that works for most partners: two or three genuine conversations a week, from people already in your day. Volume is not the lever here — a partner who submits five well-qualified referrals a month out-earns one who submits forty numbers scraped from somewhere.",
          },
        ],
      },
      {
        title: "The five qualifying questions",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              "“What is the money for, and by when do you need it?” — gives you the product and the urgency in one answer.",
              "“How much are you looking for?” — tells you whether it is a card, a personal loan or a secured case.",
              "“Are you salaried or self-employed, and roughly what comes in every month?” — decides which door the file goes through.",
              "“Any loans or card EMIs running right now?” — this is FOIR, and it decides feasibility more than income does.",
              "“Have you applied anywhere in the last month?” — repeated enquiries hurt the score and often reveal a rejection nobody mentioned.",
            ],
          },
          {
            kind: "text",
            body: "Two minutes, five answers, and you know whether this is a referral, a referral for a different product, or a conversation to revisit in six months. Ask them in this order — the last question is easiest to ask once the person is already talking.",
          },
        ],
      },
      {
        title: "Asking for consent",
        blocks: [
          {
            kind: "text",
            body: "You must have the person’s permission before you submit their details. TrueLend records a consent version against every referral, which is only meaningful if the consent was real. This is also the moment that decides how the first call from TrueLend goes: a customer who was told to expect it answers the phone.",
          },
          {
            kind: "script",
            title: "Consent, in one breath",
            lines: [
              {
                who: "You",
                say: "I work with TrueLend — they compare loan options across banks and NBFCs and handle the whole process. Shall I pass on your name and number so one of their advisors can call you? They’ll call within a day or two, and there is no charge to you.",
              },
              { who: "Them", say: "Yes, that’s fine." },
              {
                who: "You",
                say: "Great. I’ll share only your name, number and what the loan is for. Nothing else goes across.",
              },
            ],
          },
          {
            kind: "callout",
            tone: "dont",
            title: "What is not consent",
            body: "A number you found in a group. A contact list you exported. A friend’s cousin who has not been spoken to yet. “He won’t mind.” If you have not asked the person directly and heard yes, you do not have consent — and an unexpected call is the fastest way to lose the relationship you were trading on.",
          },
        ],
      },
      {
        title: "What a useful referral note looks like",
        blocks: [
          {
            kind: "text",
            body: "The free-text note on the referral form is where you convert your relationship into an advantage for the advisor who calls. Compare these two.",
          },
          {
            kind: "callout",
            tone: "dont",
            title: "Weak",
            body: "“Needs loan urgently. Good person. Please call.”",
          },
          {
            kind: "callout",
            tone: "do",
            title: "Strong",
            body: "“Runs a two-year-old auto parts shop in Nashik, GST registered. Needs about ₹15 L for stock before the festive season. Turnover shows in the current account; ITR is on the lower side. Prefers a call after 7 pm. Has one vehicle loan EMI of ₹9,000 running.”",
          },
          {
            kind: "text",
            body: "The second note lets an advisor pick the right lender on the first attempt. It also costs you thirty seconds.",
          },
        ],
      },
    ],
  },

  {
    slug: "the-dashboard",
    title: "Using your dashboard properly",
    minutes: 8,
    summary:
      "The two ways to submit a referral, what every field on the form is really asking, and how to read a status without calling anyone.",
    outcomes: [
      "Choose between the form and your referral link",
      "Fill the referral form so the first advisor call is productive",
      "Read any status and know whether it needs you",
    ],
    lessons: [
      {
        title: "Two ways to refer",
        blocks: [
          {
            kind: "table",
            head: ["Method", "Use it when", "How"],
            rows: [
              [
                "The referral form",
                "You have spoken to the person and know their details",
                "Refer Someone → fill the form → submit",
              ],
              [
                "Your referral link or QR",
                "The person prefers to fill their own details, or you are sharing with a group",
                "Refer Someone → copy your link or show the QR",
              ],
            ],
          },
          {
            kind: "text",
            body: "Both attach the referral to your account, so both count the same. The link is genuinely better in one case: when the customer would rather type their own income and phone number than have you write them down. Your reference ID is what ties a link submission back to you, so use your own link, never someone else’s.",
          },
        ],
      },
      {
        title: "The referral form, field by field",
        blocks: [
          {
            kind: "table",
            head: ["Field", "Needed?", "Why it matters"],
            rows: [
              [
                "Product they need",
                "Best effort",
                "Routes the file to the right desk. “Not sure / any” is honest and fine.",
              ],
              [
                "Loan amount",
                "Best effort",
                "Decides the lender shortlist. A rough figure beats a blank.",
              ],
              ["Preferred tenure", "Optional", "Shapes the EMI the advisor will discuss."],
              [
                "Purpose",
                "Optional",
                "End-use changes the product — “stock purchase” and “wedding” go different ways.",
              ],
              ["Name", "Required", "Must match their PAN, or the file stalls later."],
              [
                "Mobile number",
                "Required",
                "The single most important field. One wrong digit wastes everyone’s week.",
              ],
              ["Email", "Optional", "Used for the application link and sanction communication."],
              [
                "Pincode and city",
                "Best effort",
                "Lender availability is local, especially for secured loans.",
              ],
              [
                "Residence type",
                "Optional",
                "Owned property is a positive signal to most lenders.",
              ],
              [
                "Employment type",
                "Best effort",
                "Salaried and self-employed are assessed completely differently.",
              ],
              [
                "Monthly income",
                "Best effort",
                "Drives the eligibility estimate before anyone calls.",
              ],
              [
                "Employer name and experience",
                "Optional",
                "Job stability, and some employers are on lender category lists.",
              ],
              [
                "Existing EMI",
                "Best effort",
                "This is FOIR. Leaving it blank is the most common cause of a wasted call.",
              ],
              [
                "Asset value / annual turnover",
                "When shown",
                "Appears for secured and business products, because that is what is lent against.",
              ],
              ["Message", "Recommended", "Your context. See the previous module."],
              [
                "Consent",
                "Required",
                "You are confirming the person agreed. Do not tick it otherwise.",
              ],
            ],
          },
          {
            kind: "callout",
            tone: "do",
            title: "If you fill only four fields, fill these",
            body: "Correct mobile number, real name, rough amount, and existing EMIs. Those four decide whether the first call goes anywhere.",
          },
        ],
      },
      {
        title: "Reading the status page",
        blocks: [
          {
            kind: "table",
            head: ["Status", "What it means for you"],
            rows: [
              ["New", "Nothing to do. An advisor is about to call."],
              [
                "Contacted",
                "Working. Do not call the customer to check — it duplicates the advisor.",
              ],
              ["Qualified", "Good sign. The profile holds up."],
              [
                "Docs Collected",
                "The customer is cooperating. A nudge from you helps only if they have gone quiet.",
              ],
              ["Logged In", "With the lender. Now it runs on the lender’s clock."],
              ["Approved", "Sanctioned. Not finished — disbursal conditions still have to be met."],
              ["Disbursed", "Done. An eligible incentive is recorded after the team verifies it."],
              [
                "Declined",
                "This lender said no. Ask support whether another lender is being tried before you tell the customer anything.",
              ],
              [
                "Lost",
                "The customer disengaged. Worth a friendly check-in months later, not a chase now.",
              ],
            ],
          },
          {
            kind: "callout",
            tone: "note",
            title: "Where partners lose goodwill",
            body: "Calling the customer every second day to ask about their loan. Once you have handed over, the advisor is calling them too, and two people asking the same questions makes TrueLend look disorganised and makes you look anxious. Check the status page instead; email support with the customer’s name if something looks stuck.",
          },
        ],
      },
    ],
  },

  {
    slug: "conversations",
    title: "The conversations you will actually have",
    minutes: 8,
    summary:
      "Scripts for the five moments that decide whether a referral happens: the opening, the money question, the weak score, the earlier rejection, and “why not go to the bank myself”.",
    outcomes: [
      "Open a referral conversation without sounding like a salesman",
      "Answer the awkward questions honestly and quickly",
      "Say no to a case you should not take",
    ],
    lessons: [
      {
        title: "Opening, without a pitch",
        blocks: [
          {
            kind: "script",
            title: "Someone mentions a need in passing",
            lines: [
              {
                who: "Them",
                say: "We’re looking at a flat in Wakad, but the loan part is confusing.",
              },
              {
                who: "You",
                say: "I work with TrueLend — they compare home loans across banks and NBFCs, and they do the running around. Want me to have someone call you and explain what you’d actually be eligible for? No charge, and no obligation.",
              },
              { who: "Them", say: "What do they charge?" },
              {
                who: "You",
                say: "Nothing to you. The lender pays them when the loan is disbursed. If nothing works out, you’ve lost nothing but a phone call.",
              },
            ],
          },
        ],
      },
      {
        title: "“So what do you get out of it?”",
        blocks: [
          {
            kind: "script",
            title: "The money question, answered straight",
            lines: [
              { who: "Them", say: "Are you getting a commission for this?" },
              {
                who: "You",
                say: "Yes — TrueLend gets paid by the lender when a loan is disbursed, and I get a share of that. Nothing is charged to you at any point. If anyone ever asks you for a fee in my name, tell me immediately.",
              },
            ],
          },
          {
            kind: "text",
            body: "Answer this one instantly and without embarrassment. People assume there is money in it; hesitating is what makes them suspicious, not the commission.",
          },
        ],
      },
      {
        title: "“My CIBIL is bad”",
        blocks: [
          {
            kind: "script",
            title: "The weak-score conversation",
            lines: [
              { who: "Them", say: "My score is around 660, so there’s no point." },
              {
                who: "You",
                say: "660 isn’t automatically a no — it narrows the list. Can I ask two things? Have you missed EMIs in the last six months, and do you own any property?",
              },
              { who: "Them", say: "No misses recently. We own our house." },
              {
                who: "You",
                say: "Then it’s worth a conversation — a secured option is usually available at that score, and if you’d rather wait, the team can tell you what to fix and how long it takes. Shall I pass on your number?",
              },
            ],
          },
          {
            kind: "callout",
            tone: "dont",
            title: "What you never say here",
            body: "“Don’t worry, we’ll manage it.” “There are ways to improve the score quickly.” “Someone I know can arrange it.” Every one of those is either false or an offence, and all three end the same way.",
          },
        ],
      },
      {
        title: "“The bank already rejected me”",
        blocks: [
          {
            kind: "script",
            title: "After a rejection elsewhere",
            lines: [
              { who: "Them", say: "HDFC already said no, so what’s the point." },
              {
                who: "You",
                say: "Did they tell you why? Every lender has different rules — a profile one bank won’t touch is routine for another, especially for self-employed applicants.",
              },
              { who: "Them", say: "They said income proof wasn’t enough." },
              {
                who: "You",
                say: "That’s a common one, and it usually means the file went to the wrong kind of lender. Let me pass this on — mention the rejection to the advisor, it genuinely helps them pick the right one.",
              },
            ],
          },
          {
            kind: "text",
            body: "Always put a previous rejection in the referral note. Hiding it does not help anyone: the enquiry is already on the credit report, and the advisor will see it.",
          },
        ],
      },
      {
        title: "“Why not just go to the bank myself?”",
        blocks: [
          {
            kind: "script",
            title: "The fair answer",
            lines: [
              { who: "Them", say: "I can walk into my own bank and ask." },
              {
                who: "You",
                say: "You can, and if your own bank gives you a good offer, take it. The difference is that they’ll show you one option — their own. TrueLend puts the same file in front of several lenders and tells you which one is actually cheaper after fees. It costs you nothing to see the comparison.",
              },
            ],
          },
          {
            kind: "callout",
            tone: "do",
            title: "Be willing to lose one",
            body: "If the customer’s own bank genuinely offers a better deal, say so and let it go. You will hear from that person again, and from the people they talk to. Partners who argue at this point get one referral and no second one.",
          },
        ],
      },
    ],
  },

  {
    slug: "rules",
    title: "Rules you cannot break",
    minutes: 6,
    summary:
      "The short list of things that end a partnership — and, in two cases, involve the police rather than an email.",
    outcomes: [
      "Recite the non-negotiables without looking them up",
      "Recognise the requests you must refuse and report",
      "Understand why each rule exists, not just that it does",
    ],
    lessons: [
      {
        title: "The non-negotiables",
        blocks: [
          {
            kind: "list",
            items: [
              "Never take money from a customer — not a file charge, not a “processing fee”, not a favour. Your income comes from TrueLend after a disbursal.",
              "Never promise an approval, a rate, an amount or a timeline. Only the lender decides, and only in writing.",
              "Never submit anyone’s details without their permission first.",
              "Never collect, store, photograph or forward a customer’s documents.",
              "Never ask for or accept an OTP, a password, a card number or net-banking credentials. No genuine process needs them from you.",
              "Never present yourself as a bank employee, an RBI official, or a TrueLend employee. You are a Referral Partner — that title is enough.",
              "Never inflate income, alter a document, or help anyone “arrange” paperwork.",
              "Never submit the same person twice or submit someone another partner is already working with.",
              "Never share your login, and never refer using someone else’s referral link.",
            ],
          },
          {
            kind: "callout",
            tone: "dont",
            title: "Two of these are crimes, not policy",
            body: "Collecting money from a customer in TrueLend’s name, and arranging or altering documents, are criminal offences in India — cheating and forgery respectively. They also destroy the customer, who is the one left holding a loan obtained on false papers.",
          },
        ],
      },
      {
        title: "When to stop and report",
        blocks: [
          {
            kind: "text",
            body: "Some requests are a test of whether you are a safe person to deal with. The correct response to all of them is to decline, and to email Referral Partner Support from your registered address with what happened.",
          },
          {
            kind: "list",
            items: [
              "Anyone asking whether income documents can be “managed” or “adjusted”.",
              "Anyone offering to pay you personally to push a file through.",
              "Anyone claiming to be from TrueLend and asking a customer for a fee.",
              "A customer asking you to receive the disbursal in your account.",
              "Anyone asking for your dashboard login or a customer’s OTP.",
            ],
          },
          {
            kind: "callout",
            tone: "note",
            title: "Reporting protects you",
            body: "If a case later goes wrong, the record of you having flagged it is what separates you from the person who went along with it. Report early, in writing, from your registered email.",
          },
        ],
      },
    ],
  },

  {
    slug: "mistakes",
    title: "Mistakes that quietly kill referrals",
    minutes: 5,
    summary: "The ordinary, well-meaning errors that cost partners their best cases.",
    outcomes: [
      "Avoid the seven most common referral-killing habits",
      "Know what to do instead in each case",
    ],
    lessons: [
      {
        title: "Seven habits to drop",
        blocks: [
          {
            kind: "table",
            head: ["The mistake", "What actually happens", "Do this instead"],
            rows: [
              [
                "One wrong digit in the mobile number",
                "The advisor calls a stranger; the file sits idle; the customer thinks nobody called",
                "Read the number back to the customer before you submit",
              ],
              [
                "Submitting without asking first",
                "The customer is annoyed by an unexpected call and blames you",
                "Get a clear yes, and tell them who will call and when",
              ],
              [
                "“You’ll definitely get it”",
                "One decline and you have lost the relationship, not just the case",
                "“Let’s find out what you’re eligible for” — accurate, and just as encouraging",
              ],
              [
                "Leaving existing EMIs blank",
                "Eligibility is estimated wrong and the file is rejected late",
                "Ask question four from Module 6 every time",
              ],
              [
                "Chasing the customer daily after handover",
                "Two people asking the same questions; the customer disengages",
                "Read the status page; email support with the customer’s name if it looks stuck",
              ],
              [
                "Referring the same person again next month",
                "A duplicate file and a confused customer",
                "Check the status page first — the earlier referral is still there",
              ],
              [
                "Going quiet after a decline",
                "The customer feels abandoned at their worst moment",
                "Tell them honestly, ask support whether another lender is possible, and revisit in six months",
              ],
            ],
          },
        ],
      },
      {
        title: "A workable weekly rhythm",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              "Two or three real conversations a week from people already in your day.",
              "Submit the same day you get consent, while the details are still accurate.",
              "Open the status page once a week and look only for files that have not moved.",
              "Email support about anything stuck for more than two weeks, with the customer’s name.",
              "Check the Rewards page monthly, and query anything that looks wrong.",
            ],
          },
          {
            kind: "text",
            body: "That is about thirty minutes a week. Partners who do this consistently for a year out-earn every burst of enthusiasm that stops in March.",
          },
        ],
      },
    ],
  },
];

/** Self-check for the end of the course. Answers are visible on purpose — this is a study aid, not an exam. */
export const knowledgeCheck: { q: string; a: string }[] = [
  {
    q: "A customer asks you to collect ₹2,000 as a file charge. What do you do?",
    a: "Refuse, tell them nothing is ever payable to you or to TrueLend, and email Referral Partner Support from your registered address. Taking money from a customer is not a policy breach, it is cheating under Indian law.",
  },
  {
    q: "Another agent has offered your customer “10% flat”. Is that better than an 11% bank loan?",
    a: "No — it is far worse. A flat rate charges interest on the full original amount for the whole tenure. Over three years, 10% flat costs roughly the same as 18% reducing. Ask “flat or reducing?” every time.",
  },
  {
    q: "At which stage is an incentive recorded?",
    a: "After the loan is successfully disbursed and verified by the TrueLend team. Not at referral, and not at approval — a sanctioned file can still fail before the money moves.",
  },
  {
    q: "A customer sends you a photo of their Aadhaar on WhatsApp. What now?",
    a: "Do not forward it, do not save it, and delete it. Tell them the TrueLend team will collect documents directly. Your KYC page is for your own documents only.",
  },
  {
    q: "Net salary ₹80,000, existing EMIs ₹15,000. Roughly what EMI can they support?",
    a: "About ₹29,000. Take 55% of ₹80,000 = ₹44,000, subtract the ₹15,000 already running. Treat it as a ballpark for deciding whether to have the conversation, never as a quote.",
  },
  {
    q: "A referral shows “Approved”. Should you tell the customer the loan is done?",
    a: "No. Approved means sanctioned; disbursal conditions still have to be met and files do fail at this stage. Congratulate them on the sanction and let the advisor confirm disbursal.",
  },
  {
    q: "Someone’s CIBIL is 640 and they own their house. Refer or not?",
    a: "Refer, and say so in the note. Unsecured lending is unlikely at that score, but a secured option against the property is a normal case. What you must never say is that the score can be fixed.",
  },
  {
    q: "A self-employed customer earns well but declares very little in his ITR. What is the honest route?",
    a: "Do not suggest inflating anything. Route him towards products assessed on banking turnover or on an asset — working capital, or a loan against property — and put the ITR position in the referral note.",
  },
  {
    q: "Your customer was already rejected by one bank. Do you mention it?",
    a: "Always. The enquiry is already visible on the credit report, and knowing the reason helps the advisor pick a lender that will actually say yes.",
  },
  {
    q: "Which four fields matter most on the referral form?",
    a: "Correct mobile number, the customer’s real name, a rough loan amount, and existing EMIs. Those four decide whether the first advisor call goes anywhere.",
  },
];
