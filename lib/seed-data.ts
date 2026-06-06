// Seed content for the relationship library — the four demo relationships and
// their archived events. Analysis is stored in the original multi-field form;
// the seed script collapses it to the 3-step {happened, trigger, forward} shape
// the UI uses (see migrateAnalysis below), so this stays the single source.

export interface SeedAnalysis {
  summary?: string;
  psychology?: string;
  fault?: string;
  profiles?: string;
  forward?: string;
  patterns?: string;
  watchout?: string;
}

export interface SeedEvent {
  title: string;
  date: string;
  tags: string[];
  msgs: { who: string; text: string }[];
  analysis: SeedAnalysis;
}

export interface SeedProfile {
  name: string;
  type: string;
  initial: string;
  color: string;
  patterns: string[];
  tensions: string[];
  notes: string;
  archive: SeedEvent[];
}

// Collapse the original 7-field analysis into the 3-step flow the UI renders.
export function migrateAnalysis(a: SeedAnalysis): {
  happened: string;
  trigger: string;
  forward: string;
} {
  return {
    happened: a.summary || "",
    trigger: [a.psychology, a.fault, a.profiles, a.patterns, a.watchout]
      .filter(Boolean)
      .join("\n\n"),
    forward: a.forward || "",
  };
}

export const SEED_PROFILES: SeedProfile[] = [
  {
    name: "Jordan",
    type: "friend",
    initial: "J",
    color: "linear-gradient(135deg,#f0916b,#e8696b)",
    patterns: [
      "soft-exits plans instead of cancelling directly",
      "uses 'it's fine' when it isn't",
      "goes quiet after emotional asks",
      "replies become shorter when withdrawing",
    ],
    tensions: ["plans reliability", "emotional directness"],
    notes:
      "We met through university mutual friends in 2022. Jordan is generally warm but avoids conflict — tends to disappear rather than address tension directly. I care about this friendship but it makes me second-guess myself.",
    archive: [
      {
        title: "The Night She Didn't Come",
        date: "15 Mar 2026",
        tags: ["absence under pressure", "promises", "conflict avoidance"],
        msgs: [
          { who: "Jordan", text: "oh my god I'm so so sorry, work ran so late, are you ok??" },
          { who: "Me", text: "it's fine, I'm ok now, don't worry" },
          { who: "Jordan", text: "I feel so terrible. Can I call tomorrow?" },
          { who: "Me", text: "sure" },
        ],
        analysis: {
          summary:
            "You had a health scare that landed you in A&E alone. Jordan had said she'd come. Two hours before, she texted that work had run late. You told her it was fine. She never called the next day.",
          psychology:
            "Showing up for someone in crisis requires overriding personal discomfort — for conflict-avoidant people, the discomfort of the hospital, the emotional weight of illness, the vulnerability of being needed all activate the same withdrawal reflex as conflict. Jordan's 'work ran late' may have been true, but it was also the path of least resistance. Her 'Can I call tomorrow?' was likely genuine relief at the exit you gave her.",
          fault:
            "Jordan failed here. Not because people don't have hard nights, but because she made a promise and didn't keep it, and because she didn't call the next day. You absorbing it with 'it's fine' meant she didn't have to sit with the weight of that. You protected her from the consequence of letting you down.",
          profiles:
            "Jordan: emotionally generous in low-stakes moments, but her avoidance style becomes a liability when the stakes are real. You: habitual self-sufficiency — you said 'it's fine' because asking for more felt like too much to ask. That's worth noticing about yourself too.",
          forward:
            "You don't have to relitigate this event. But you now know what Jordan can and can't do. She's not someone to call from the waiting room. Adjust your expectation of her accordingly — not as punishment, but as accuracy.",
          patterns:
            "This is the highest-stakes instance of her avoidance pattern. The same mechanism that soft-exits plans leaves you alone in a hospital. Scale matters.",
          watchout:
            "If you ever find yourself in crisis again, notice the reflex to protect Jordan from your need. The people who deserve to know you're struggling are the ones who show up — not the ones you have to manage.",
        },
      },
      {
        title: "The 'You're Not Like Other Asian Girls' Compliment",
        date: "18 Jan 2026",
        tags: ["microaggression", "othering", "cultural identity"],
        msgs: [
          { who: "Jordan", text: "honestly you're just so different from the Asian girls I grew up around, like you're so open and direct" },
          { who: "Me", text: "haha yeah" },
          { who: "Jordan", text: "it's a compliment! you know what I mean" },
        ],
        analysis: {
          summary:
            "Jordan paid you a compliment by separating you from your ethnic group. She framed it as praise. You laughed it off. The conversation moved on. You've been sitting with it since.",
          psychology:
            "This is a textbook 'positive' microaggression — a compliment structured as an exception ('you're not like other [group]'). It operates by affirming you as an individual while implicitly disparaging the group you belong to. Jordan doesn't think of herself as prejudiced, and she isn't — not consciously. But the compliment reveals an unconscious framework in which Asian women are expected to be closed, indirect, passive, and being 'open and direct' is surprising enough to comment on.",
          fault:
            "Jordan has a blind spot here, not malice. But impact and intent are different things. The harm of the comment is real even if the intention was warmth. You 'haha yeah'-ing it was a survival reflex — it's exhausting to explain, and you've probably explained versions of this before.",
          profiles:
            "Jordan: well-meaning but carrying cultural assumptions she hasn't examined. You: experienced enough with this dynamic to recognise it instantly, tired enough to not always want to address it. The labour of education is yours, and that's unfair.",
          forward:
            "You get to decide whether to name it. If you do: 'I know you meant it well, but when you say I'm different from other Asian girls it kind of implies they're all the same — and I'm kind of one of them.' You don't have to. But you don't have to pretend it didn't land either.",
          patterns:
            "This is likely not the only time this assumption has surfaced in your friendship. Watch for how Jordan frames other cultural comparisons.",
          watchout:
            "If you don't address it, it will probably happen again. Jordan doesn't know she's doing it. Silence reads as agreement.",
        },
      },
      {
        title: "The Boyfriend Disappearance",
        date: "4 Oct 2025",
        tags: ["romantic displacement", "de-prioritised", "implicit expectation"],
        msgs: [
          { who: "Jordan", text: "I miss you!!" },
          { who: "Me", text: "you literally haven't replied to my last three messages" },
          { who: "Jordan", text: "I know I know I've just been so wrapped up with Tom, you get it right? you know how it is" },
          { who: "Me", text: "yeah" },
          { who: "Jordan", text: "you're the best honestly, let's do dinner soon" },
        ],
        analysis: {
          summary:
            "Jordan started dating someone new in late summer and effectively vanished — weekly contact became nothing for six weeks. When she surfaced, she framed the reconnect as mutual ('I miss you') and asked you to validate her absence ('you get it right?'). You said yes. Dinner hasn't happened.",
          psychology:
            "New romantic attachment genuinely does compress bandwidth — neurobiologically, early-stage love occupies significant cognitive and emotional real estate. But Jordan's 'you get it right?' is doing specific work: it's seeking absolution without having to ask for it. She wanted to confirm you weren't hurt before she had to deal with the possibility that you were.",
          fault:
            "Jordan has some responsibility here — six weeks of no response isn't busyness, it's a choice repeated many times. But the more interesting question is why you said 'yeah.' You absorbed it again. You protected her from finding out you were hurt.",
          profiles:
            "Jordan: relies on close friends to be unconditionally available without reciprocating that availability. You: conflict-avoidant enough in the opposite direction — you avoid naming hurt to preserve the relationship, which means Jordan never gets accurate feedback about her impact.",
          forward:
            "'You get it right?' deserved a real answer. Even something gentle: 'Honestly, I did miss you — six weeks felt like a lot.' That's not drama; that's honesty. Jordan can handle it if you're not explosive about it.",
          patterns:
            "She surfaces with warmth when she needs reconnection and disappears when she's occupied elsewhere. The friendship functions on her schedule.",
          watchout:
            "'Let's do dinner soon' from Jordan requires a specific date or it won't happen. Don't accept it as a plan — treat it as an intention that needs converting.",
        },
      },
    ],
  },
  {
    name: "Mum 💛",
    type: "family",
    initial: "M",
    color: "linear-gradient(135deg,#f9cc6b,#f0a83b)",
    patterns: [
      "checks in via food questions when actually worried",
      "expresses concern indirectly — never asks the real question",
      "goes quiet when overwhelmed, not when uncaring",
    ],
    tensions: ["distance anxiety", "unspoken worry"],
    notes:
      'She worries but never says so directly. "Did you eat?" usually means "are you okay?" Once I learned to decode it, the dynamic got a lot warmer.',
    archive: [
      {
        title: "The Chinese New Year Guilt Call",
        date: "7 Feb 2026",
        tags: ["filial obligation", "guilt", "sibling comparison", "immigration"],
        msgs: [
          { who: "Mum", text: "你今年真的不回来吗 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Are you really not coming back this year?)</span>" },
          { who: "Me", text: "妈我真的请不了假，签证也复杂 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Mum I genuinely can't get leave, and the visa situation is complicated)</span>" },
          { who: "Mum", text: "你奶奶身体不好你知道吗，她很想你 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(You know your grandma's health isn't good — she misses you so much)</span>" },
          { who: "Me", text: "我知道，但我没办法 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(I know, but there's nothing I can do)</span>" },
          { who: "Mum", text: "你哥哥每年都回来的 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Your brother comes back every year)</span>" },
        ],
        analysis: {
          summary:
            "You explained you couldn't return home for Chinese New Year — visa constraints, leave denied. Mum invoked your grandmother's health, then your brother's annual returns as a contrast. The conversation ended without resolution. You felt guilty for days.",
          psychology:
            "This is a collision between two incompatible frameworks: your mother operates within a filial piety model where physical presence during major festivals is a non-negotiable expression of love and respect. You operate within a Western professional and legal reality where 'I can't' is a legitimate answer. Neither framework is wrong, but they're speaking past each other. The grandmother invocation and the brother comparison are both guilt tools — not consciously deployed manipulation, but deeply ingrained patterns for expressing hurt when the expected behaviour doesn't occur.",
          fault:
            "There's no clean fault here. Your mum's disappointment is real and culturally coherent within her framework. Your inability to return is also real. The brother comparison is unfair — comparing two people's circumstances as if they're equivalent erases context. That part is worth pushing back on, gently.",
          profiles:
            "Mum: expresses love through presence and obligation — absence reads as abandonment in her emotional vocabulary. She grew up in a world where leaving your family meant staying close to them anyway. You: living between two cultural systems, expected to honour both and punished when geography makes that impossible. The immigration reality — visa, leave, cost — is invisible to her in ways that are genuinely hard to explain.",
          forward:
            "You can't fix the distance or the holiday. But you can address the framework mismatch directly at some point, not in the heat of the conversation: 'I know it doesn't feel the same, but visa restrictions aren't the same as choosing not to come. I need you to understand that part.' The brother comparison needs naming — 'comparing me to [brother] isn't fair when our situations are different.'",
          patterns:
            "This conversation will recur at every major festival. The guilt structure — grandmother's health, sibling contrast — is consistent. Knowing it's coming doesn't make it easier, but it means you can prepare rather than absorb it raw.",
          watchout:
            "Don't try to resolve this over text or in the immediate moment after the news. Mum's hurt needs time before she can hear a rational explanation. Give it a few days, then reconnect with warmth rather than justification.",
        },
      },
      {
        title: "The Xiao Li Comparison Call",
        date: "20 Nov 2025",
        tags: ["comparison", "career pressure", "indirect communication", "social expectation"],
        msgs: [
          { who: "Mum", text: "你同学小李现在在哪工作啊 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Where is your classmate Xiao Li working these days?)</span>" },
          { who: "Me", text: "不知道，我们不怎么联系了 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(I don't know, we don't really keep in touch)</span>" },
          { who: "Mum", text: "她妈跟我说她在银行。很稳定。你有没有考虑过... <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Her mum told me she's at a bank. Very stable. Have you ever considered...)</span>" },
          { who: "Me", text: "妈我现在做的挺好的 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Mum, I'm doing really well in what I do)</span>" },
          { who: "Mum", text: "我就是随便问问 <span style='color:var(--sage-sub);font-style:italic;font-size:11px'>(Just asking, no reason)</span>" },
        ],
        analysis: {
          summary:
            "Mum opened the conversation asking about a former classmate, then used her career (banking, stable) as a launchpad for an unfinished question about your path. You cut it off. She retreated with '我就是随便问问'. Nothing was resolved; the anxiety behind the question stayed.",
          psychology:
            "The Xiao Li manoeuvre is a Chinese parenting classic: expressing concern about your child's choices via a peer who represents the 'safer' path, without having to say directly 'I'm worried about you.' It's face-saving — it doesn't require the parent to openly criticise, which would be uncomfortable — but it communicates the criticism clearly. 'Very stable' is not a neutral description; it's a value statement. The unfinished 'have you considered...' is the real question, which she withdrew when she felt resistance.",
          fault:
            "Mum's communication style puts the interpretive burden entirely on you. You're expected to receive an indirect critique, translate it, and respond without naming what's happening — because naming it would be aggressive. That's a lot to carry. The comparison itself is unfair: your classmate's circumstances, skills, interests, and life are different from yours. Using someone else's stability to imply your instability is not accurate.",
          profiles:
            "Mum: measures security through legibility — banking, medicine, law, government are careers she can explain at the dinner table to relatives. Creative, tech, or non-traditional careers are harder to defend socially, which makes her anxious. Her worry is genuine; the expression of it is indirect and comparative because that's how she learned to communicate care. You: defensive enough around career topics to shut the conversation down before it opens. That protects you short-term but means she never gets to say what she's actually worried about.",
          forward:
            "At some point, ask the actual question for her: 'Are you worried about my job security? We can talk about that.' It defuses the proxy and gives her the real conversation. She probably needs to hear specifics — what you earn, what the trajectory looks like — not because she's materialistic, but because legibility = safety in her framework.",
          patterns:
            "Xiao Li will be replaced by someone else next time. The pattern is: peer reference → implicit comparison → unfinished question → retreat when met with resistance. The content changes; the structure doesn't.",
          watchout:
            "Don't dismiss these calls as nagging. Underneath the comparison is genuine anxiety about your wellbeing. The anxiety is worth taking seriously even when the method of expressing it is frustrating.",
        },
      },
    ],
  },
  {
    name: "Alex (design lead)",
    type: "manager",
    initial: "A",
    color: "linear-gradient(135deg,#7ac99b,#3fb37f)",
    patterns: [
      'gives feedback as questions ("have you considered...?")',
      "deadline shifts signal scope change, not poor planning",
      "silence in group chat = thinking, not ignoring",
      'says "interesting" when he disagrees',
    ],
    tensions: ["feedback style ambiguity", "deadline communication"],
    notes:
      'Alex is fair but very indirect with criticism. Once you know his tells — "interesting", the rhetorical question feedback — he\'s actually quite easy to read. He pushes deadlines when requirements shift; it\'s a pattern, not randomness.',
    archive: [
      {
        title: "The Credit That Went Elsewhere",
        date: "9 Apr 2026",
        tags: ["credit", "visibility", "hierarchy", "workplace dynamics"],
        msgs: [
          { who: "Alex", text: "great presentation today team, client loved it" },
          { who: "Me", text: "glad it landed — happy to debrief on the research layer if useful" },
          { who: "Alex", text: "yeah for sure, send over the deck and I'll review" },
          { who: "Me", text: "already shared it in the folder" },
          { who: "Alex", text: "perfect, cheers" },
        ],
        analysis: {
          summary:
            "You led the research and built the core of the brief that was presented to the client today. Alex presented it. The client praised 'the team.' Alex's follow-up message said 'great work team.' Your name wasn't mentioned in the room or afterwards. Alex asked for your deck after the fact, not before.",
          psychology:
            "Credit invisibility is one of the most common and damaging dynamics in hierarchical workplaces. Managers often use 'team' language genuinely — they think of output as collective — without realising that this language is not neutral when contribution is unequal. It's possible Alex thinks he's being egalitarian. It's also possible he's unconsciously claiming the outcome. Both happen, and the effect on you is the same either way.",
          fault:
            "Alex has a responsibility here. Even if he didn't intend to erase your contribution, not naming you once — to the client, in his follow-up — is a failure of leadership. The fact that he asked for your deck after the presentation rather than before suggests the relationship between your work and the output was not clearly attributed in his own framing.",
          profiles:
            "Alex: likely doesn't experience this as credit-taking because he sees the work as 'the team's.' But he is the face of the team to the client, and that asymmetry has consequences. You: probably sat on this rather than naming it in the moment. That's rational — objecting publicly would be career-risky. But silence accretes.",
          forward:
            "This deserves a direct but measured private conversation: 'I wanted to flag something — I felt like my contribution to the brief wasn't very visible in the client presentation. I'm not sure if that was intentional, but I wanted to mention it.' This is not an accusation. It's a professional ask for visibility. His response will tell you a lot about whether this is worth pushing.",
          patterns:
            "Watch whether this is a one-off or a pattern. If it happens again, it's structural — he consistently takes credit upward. That changes the calculus of how much you invest.",
          watchout:
            "Don't let this sit without flagging it. If you absorb it silently, it will happen again and you'll have a harder time raising it later.",
        },
      },
      {
        title: "The 'Be More Assertive' Feedback",
        date: "14 Jan 2026",
        tags: ["cultural coding", "feedback ambiguity", "double standard", "race"],
        msgs: [
          { who: "Alex", text: "one bit of feedback from the client call — I think you could push back more, be a bit more confident in the room" },
          { who: "Me", text: "yeah, okay, I'll keep that in mind" },
          { who: "Alex", text: "you've got great ideas, just want to make sure they land" },
        ],
        analysis: {
          summary:
            "After a client call, Alex told you to be 'more assertive' and 'more confident in the room.' You said okay. You've been turning it over ever since — because you're not sure if it's fair feedback or a culturally coded double standard.",
          psychology:
            "This is one of the most documented tensions in cross-cultural workplace dynamics. 'Assertive' and 'confident' in Western professional contexts — particularly client-facing roles — often map onto a very specific communication style: interruptive, declarative, high-volume, low-deference. Research consistently shows that women, and particularly women of colour, are penalised for both conforming to this style (aggression, pushiness) and for not conforming (timid, not a leader). Alex may be giving you honest feedback about what the client expects. He may also be describing a norm you're not obligated to meet on its own terms.",
          fault:
            "The feedback is worth interrogating before accepting. Ask yourself: in that call, did you have ideas that didn't get heard, or did you speak and not get credit? Those are different problems. If your ideas didn't get heard, assertiveness coaching might help. If they did get heard but not attributed to you, that's a room dynamics problem — not your confidence.",
          profiles:
            "Alex: almost certainly well-intentioned, and may genuinely not be aware of the cultural specificity of 'assertive.' He's trying to help you advance. That makes this feedback both sincere and potentially misleading. You: processing whether to adapt to a norm that may be structurally biased, or to hold your ground. Both are valid choices with real costs.",
          forward:
            "Ask Alex a clarifying question before taking the feedback at face value: 'When you say assertive — are there specific moments where I had something to contribute and didn't? I want to make sure I'm working on the right thing.' This reframes it as a skill conversation, not a personality critique, and forces specificity.",
          patterns:
            "Track whether this feedback applies to your male colleagues equally. If it doesn't, that's information.",
          watchout:
            "Don't internalise this as a character flaw. 'Not assertive enough' can mean three completely different things, only one of which is about you.",
        },
      },
    ],
  },
  {
    name: "Liv",
    type: "friend",
    initial: "L",
    color: "linear-gradient(135deg,#c79be8,#9b6be2)",
    patterns: [
      "escalates via memes before saying what's actually wrong",
      "goes into planning mode when anxious",
      "never cancels — overcommits instead",
    ],
    tensions: ["communication indirection", "overcommitment"],
    notes:
      "Liv is my ride-or-die but communicates in layers. The meme she sends before a conversation is usually the real message.",
    archive: [
      {
        title: "The Loyalty Test No One Named",
        date: "22 Mar 2026",
        tags: ["implicit expectation", "loyalty demand", "conflict avoidance", "group dynamics"],
        msgs: [
          { who: "Liv", text: "I just can't believe you're still hanging out with her after everything" },
          { who: "Me", text: "I didn't know I had to choose, you never said anything" },
          { who: "Liv", text: "I mean... I kind of thought it was obvious" },
          { who: "Me", text: "it really wasn't, Liv" },
          { who: "Liv", text: "I'm not trying to make this a big thing, I just thought we were on the same page" },
        ],
        analysis: {
          summary:
            "There was a falling-out in your friend group. Liv stopped speaking to someone. She expected you to do the same — without saying so. You didn't. When you found out she'd been venting to others about you for 'not picking a side,' you confronted her. She said she thought it was obvious.",
          psychology:
            "Implicit loyalty demands are one of the most corrosive dynamics in close friendships, particularly in female friendship networks with high interdependence. 'I thought it was obvious' is the tell — it means the expectation existed entirely in Liv's head and was never communicated, but you were expected to have received it anyway. This is a common feature of anxious attachment in friendships: the need for alignment is so strong that it goes unspoken, because naming it would risk finding out the other person doesn't feel it.",
          fault:
            "Liv set a test she never told you about and then marked you as failing it. That's not fair — you cannot consent to a rule you don't know exists. The fact that she was venting to others rather than talking to you directly is also a significant problem. She had multiple opportunities to say 'hey, it would mean a lot to me if you didn't stay close with her' and didn't take any of them.",
          profiles:
            "Liv: has very high loyalty expectations and experiences deviation from them as betrayal, but is conflict-avoidant enough that she expresses this through indirect channels (venting to others, withdrawal) rather than direct asks. You: operate on the assumption that what hasn't been said hasn't been expected — a reasonable assumption that doesn't protect you here.",
          forward:
            "Two things need to happen. First, Liv needs to understand that unstated expectations aren't fair: 'I need you to tell me when you need something from me. I can't guess.' Second, the venting-to-others piece needs to be named: 'If you had a problem with something I did, I'd rather you came to me first.' Both are uncomfortable but necessary.",
          patterns:
            "Liv expresses conflict indirectly and expects others to read the signal. This is the same mechanism as the ex situation — she withholds, waits, and then either confronts when it's built up or you find out through other channels.",
          watchout:
            "In future group-dynamic situations, check in with Liv early rather than assuming neutrality is safe. A quick 'how are you feeling about everything with X?' gives her the opening to name the expectation before it becomes a test.",
        },
      },
      {
        title: "The Secret She Kept About My Ex",
        date: "5 Dec 2025",
        tags: ["withholding", "protection vs honesty", "loyalty conflict", "humiliation"],
        msgs: [
          { who: "Me", text: "why didn't you tell me" },
          { who: "Liv", text: "I didn't want to hurt you, I was trying to protect you" },
          { who: "Me", text: "I found out at the birthday dinner Liv. In front of everyone." },
          { who: "Liv", text: "I know. I'm so sorry. I thought if I told you it would make things worse" },
          { who: "Me", text: "so you just let me walk in there not knowing" },
          { who: "Liv", text: "I genuinely thought I was doing the right thing" },
        ],
        analysis: {
          summary:
            "Your ex started dating someone in your shared friend group. Liv knew for approximately two months. She didn't tell you. You found out at a group birthday dinner — in front of everyone, including the new couple. You felt humiliated. Liv says she was protecting you.",
          psychology:
            "The protective withholding dilemma is real: Liv was genuinely caught between two bad options — tell you and cause pain, or don't tell you and risk worse pain if you find out publicly. She made a call. The call was wrong, but the intention behind it was not malicious. What's worth examining is whether her choice was actually about protecting you, or whether it was about protecting herself from a very uncomfortable conversation.",
          fault:
            "Liv made a unilateral decision about what you could handle, and that decision robbed you of agency. You could have prepared. You could have chosen not to go. You could have had a private moment to process. Instead, you were blindsided in public. That's the harm — not the information itself, but being denied the ability to choose how to receive it. The two months is significant. At some point, protection becomes avoidance.",
          profiles:
            "Liv: intensely protective of the people she loves, but that protectiveness sometimes slides into controlling the narrative rather than trusting you with it. She made herself the decision-maker about your emotional life, which — however loving — is not her call. You: needed her to trust you with the information. The public discovery was exactly what her 'protection' created.",
          forward:
            "Liv needs to understand the specific harm: 'When you decided for me that I couldn't handle it, you took away my choice. That's what hurt — not that you were trying to protect me, but that you didn't trust me to know what I could handle.' This reframes it as a trust conversation rather than a betrayal conversation, which Liv will be able to hear more clearly.",
          patterns:
            "Liv is a buffer — she absorbs and mediates between people she loves. That's a gift and a liability. Watch for future situations where she's sitting on information that affects you. The pattern of protective withholding will likely repeat.",
          watchout:
            "You may need to explicitly tell Liv your preference: 'Even if it hurts, I'd rather know things from you than find out some other way.' She needs that stated — she won't assume it.",
        },
      },
    ],
  },
];
