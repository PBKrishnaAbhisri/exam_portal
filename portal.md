# 🎓 RGUKT Campus Online Examination & AI Proctoring Portal
## Complete Platform Guide & User Manual (Non-Technical Edition)

---

## 📌 Executive Summary

The **RGUKT Online Examination Portal** is an end-to-end, smart academic assessment platform designed specifically for college examinations, technical skill evaluations, and placement assessments. 

It provides an intuitive, distraction-free examination experience for **Students** and a comprehensive control, proctoring, evaluation, and analytics cockpit for **Faculty & Administrators**.

Equipped with built-in **AI-powered camera proctoring**, **real-time browser lockdown**, **anti-leak watermarking**, **modular multi-section timers**, **instant automated grading**, and **deep performance analytics**, the portal ensures 100% test integrity while making exam management effortless.

---

## 👥 Who Uses the Portal?

| Role | What They Do | Key Goal |
| :--- | :--- | :--- |
| **Students** | Take scheduled exams, view detailed performance breakdowns, practice domain topics, track skill progress. | Seamless, transparent, and fair testing experience. |
| **Administrators & Faculty** | Create tests, enter questions, set eligibility rules, broadcast email alerts, monitor tests live, evaluate results, discover toppers. | Zero administrative friction, complete integrity, in-depth academic insights. |
| **Placement Cell & Mentors** | Filter toppers by specialization domains (e.g. AI/ML, VLSI, Web Dev) to shortlist talent for campus recruitment. | Rapid talent discovery based on real test performance. |

---

## 🔐 1. Account Access & Security

### Student Registration & Login
- **Official College Email Verification**: Registration is restricted exclusively to valid `@rguktn.ac.in` student email addresses.
- **Student Academic Profile**: At signup, students register their **Full Name**, **Roll Number** (e.g., `N210782`), **Branch** (CSE, ECE, EEE, MECH, CIVIL, IT, etc.), **Current Academic Year** (1st to 4th year), and **Current CGPA**.

- **Specialization Domains of Interest**: 
  - Students must select at least one domain of interest (e.g., *Web Development*, *AI / ML*, *Cybersecurity*, *VLSI & Chip Design*, *Electric Vehicles*).
  - The portal automatically filters available domains to match the student’s branch.
  - Selected domains stay permanently saved to the student’s profile across all logins.
- **Session Continuity**: Login sessions stay securely authenticated so students do not have to repeatedly enter details.

### Admin Account Access
- Dedicated sign-in for faculty and examination administrators using college credentials with administrative privileges.

### Forgot Password with Email OTP Verification
- If a student forgets their password, they simply enter their registered college email.
- The portal dispatches a secure **6-digit One-Time Password (OTP)** to their email inbox.
- Once verified, the student enters their new password and regains access immediately without waiting for manual admin reset.

---

## 👨‍🎓 2. The Student Experience

```
+-------------------------------------------------------------------------------+
|                             STUDENT PORTAL FLOW                               |
|                                                                               |
|  [Dashboard] ---> [Instructions Check] ---> [AI Proctored Exam] ---> [Result] |
|   (My Exams)       (Camera & Rules)          (Timer & Watermark)      (Scores)|
+-------------------------------------------------------------------------------+
```

### A. Student Dashboard ("My Exams")
When students log in, they land on their personalized dashboard showing three curated sections:
1. **Live Exams**: Exams happening right now that the student is eligible for. A bright **"Start Exam"** button lets them jump right in.
2. **Upcoming Exams**: Scheduled future exams with countdown timers, subject details, duration, and eligible domains.
3. **Completed Exams**: Past exams attempted by the student with instant access to check scores or review solutions.
4. **Smart Eligibility Filtering**: Students only see exams meant for their branch, academic year, and selected domains. No confusion with other departments' tests.
5. **Profile Quick View**: Sidebar displays current roll number, branch, year, CGPA, and count of chosen specialization domains.

---

### B. Pre-Exam Verification & System Check
Before entering any test, students go through a clear pre-flight screen:
- **Webcam Permission**: Confirms camera access is granted for proctoring.
- **Fullscreen Prompt**: Verifies that the browser is in full-screen mode to prevent background app usage.
- **Exam Rules & Guidelines**: Clearly displays total time, number of questions, negative marking rules (if applicable), and violation limits.

---

### C. Live Examination Environment
The exam room is purpose-built for clean reading, zero distractions, and maximum security:

```
+-------------------------------------------------------------------------------+
| [Header] Exam Title | Timer: 45:00 | Violations: 0/3           [Submit Exam]  |
+-------------------------------------------------------+-----------------------+
|  [QUESTION VIEWER]                                    | [CAMERA PROCTOR]      |
|  Question 5 of 30 (+1 Mark, -0.25 on wrong)           | ● Live Face Detected  |
|                                                       +-----------------------+
|  What is the time complexity of QuickSort average?    | [QUESTION PALETTE]    |
|                                                       | [1] [2] [3] [4] (5)   |
|  (A) O(n)            (B) O(n log n)                   | [6] [7] [8] [9] [10]  |
|  (C) O(n^2)          (D) O(log n)                     | 🟢 Answered: 4        |
|                                                       | ⚪ Remaining: 26      |
|  [Mark for Review]   [< Previous]    [Next >]         | 🟡 Review: 1          |
+-------------------------------------------------------+-----------------------+
|  *** SECURITY WATERMARK: N210782 • STUDENT NAME • EXAM-482910 OVERLAY ***     |
+-------------------------------------------------------------------------------+
```

#### 1. Question Types Supported
- **Multiple Choice (MCQ)**: Single correct option with lettered badges (A, B, C, D).
- **Multiple Select (MSQ)**: Checkbox format where one or more options can be correct.
- **Fill in the Blanks**: Text input where students type exact answers or numerical values (e.g. `3.14`).
- **Rich Diagrams & Images**: High-resolution diagrams and schematics displayed directly under question text.

#### 2. Exam Formats & Timing
- **Single-Section Exams**: Standard continuous test with a single countdown clock.
- **Multi-Section Modular Exams**: Tests split into sequential sections (e.g. *Section 1: General Aptitude (30 mins)* $\rightarrow$ *Section 2: Core Engineering (45 mins)*). Each section has its own countdown timer with smooth progression.
- **Color-Coded Timers**: The timer automatically changes color from normal (slate) to amber (< 5 mins) to glowing red (< 1 min) to warn students gently.

#### 3. Seamless Auto-Save & Progress Retention
- Every click and typed response is automatically saved in the background every few seconds.
- Even if the student accidentally refreshes or has a momentary network hiccup, their selected answers and remaining time are preserved.

#### 4. Question Navigation & Color-Coded Palette
- Students can navigate using **"Previous"** and **"Next"** buttons or jump to any question via the side palette.
- The question palette uses clear color codes:
  - ⚪ **Gray**: Not yet visited
  - 🟢 **Green**: Answered
  - 🔴 **Red**: Visited but left unanswered
  - 🟡 **Yellow**: Marked for Review (allows students to bookmark tricky questions to revisit later)
  - 🔵 **Blue Ring**: Currently active question

#### 5. Anti-Leak Screen Watermarking
- A security watermark bearing the student’s **Name**, **Roll Number**, and **Exam Code** is stamped across the screen, overlaid over questions and options.
- If anyone attempts to photograph the screen with an external phone, their personal identification is visible in the photo, discouraging test leaks.

---

### D. AI Proctoring & Anti-Cheat System
While the student takes the test, an AI engine and browser supervisor monitor the session in real time:
- 📱 **Mobile Phone & Device Detection**: The camera AI instantly detects mobile phones brought into view.
- 🖥️ **Tab Switching & Application Loss**: Flags if the student switches tabs, opens another browser window, or clicks outside.
- 🔲 **Fullscreen Exit Tracking**: Detects if the student minimizes the window.
- 🚫 **Keyboard & Mouse Lockdown**: Disables right-clicking, text copying, and pasting inside the exam window.
- ⚠️ **Violation Counter & Warnings**: Each infraction triggers a warning banner. If infractions reach the exam’s threshold (e.g., 3 strikes), the screen locks immediately.
- 🔓 **Lockout & Remote Invigilator Unlock**: A locked screen can only be resumed if the student enters a secret proctor code or if the faculty unlocks them remotely from the Live Monitor.

---

### E. Exam Submission & Result Viewing
- **Manual Submission**: A confirmation window displays how many questions were answered, how many were left blank, and requests final confirmation.
- **Automatic Submission**: When the countdown hits zero, the exam automatically saves all work and submits safely.
- **Instant vs. Controlled Results**:
  - Scores can be kept confidential while an exam is active.
  - Once the faculty publishes results, students can click into **"Results"** to view their score, percentage, passed/failed status, and full question-by-question breakdown showing their response vs. the correct answer key.

---

### F. Student Profile & Domain Management
- Students can visit **"My Profile"** to review their academic information and update their name, CGPA, and specialization domains.
- A built-in **Password Update** dialog allows changing account passwords anytime.

---

## 👨‍🏫 3. The Administrator & Faculty Experience

```
+-------------------------------------------------------------------------------+
|                              ADMIN COCKPIT                                    |
|                                                                               |
|  [Create Exam] ---> [Question Bank] ---> [Email Blast] ---> [Live Monitor]    |
|        |                                                           |          |
|        v                                                           v          |
|  [Publish Results] <--- [Manual Review] <--- [Analytics & Topper Export]      |
+-------------------------------------------------------------------------------+
```

### A. Admin Dashboard
The command center provides an at-a-glance snapshot of campus examination activity:
- Total Exams Created, Total Questions in Bank, Total Student Submissions, Active Live Sessions.
- Recent exam cards with one-click shortcuts to edit, view analytics, or monitor live.

---

### B. Creating & Scheduling an Exam
Faculty can create tests with custom parameters in a single form:
1. **Basic Info**: Title, Subject, and Description.
2. **Structure Format**: Choose between **Single-Section** or **Multi-Section** (add custom section names and durations like *Aptitude: 20m*, *Technical: 40m*).
3. **Timing**: Start Date/Time and End Date/Time.
4. **Scoring Rules**: Marks per question and optional negative marking values (e.g. -0.25).
5. **Cheating Limits**: Set violation strike limit (e.g., 3 strikes) and customized emergency unlock code.
6. **Randomization**: Shuffling of questions and options so adjacent students see different orderings.
7. **Smart Eligibility Targeting**:
   - Select eligible Branches (CSE, ECE, EEE, MECH, etc.).
   - Select eligible Academic Years (Year 1 to 4).
   - **Branch-Filtered Domain Selection**: The portal dynamically displays only the specialization domains belonging to the selected branches, preventing invalid domain assignments.

---

### C. Question Authoring & Question Bank
- **Manual Entry**: Input question text, format choices, mark correct answers, and assign optional subject/topic tags.
- **Diagram Uploads**: Upload images/diagrams stored on secure cloud hosting.
- **Central Question Bank**: Browse, search, filter, and import questions from previous exams into new ones with a single click.

---

### D. Bulk Email Broadcast to Eligible Students
- Once an exam is ready, faculty click **"Notify Students"**.
- The portal identifies all eligible students matching the exam's branch, year, and domains and sends personalized exam invitation emails containing the exam title, schedule, duration, and exam code.
- **Live Progress Counter**: Displays real-time streaming count (e.g., `Sent 142/150`).
- **Visual Sent State**: On the All Exams page, the notification button turns **Green with a "Sent" badge**, indicating that students have already been notified.

---

### E. Live Proctoring & Real-Time Candidate Monitor
During live examinations, faculty can watch all participating students in real time:
- **Active / Idle Status**: Live heartbeats report connection status every few seconds.
- **Answer Progress**: See how many questions each student has answered live.
- **Live Violation Counters**: Color-coded badges highlight students with zero infractions vs. students accumulating warning strikes.
- **One-Click Remote Unlock**: If a genuine student gets locked due to an accidental browser glitch, the faculty can unlock their session remotely from the dashboard without needing to share unlock codes.

---

### F. Manual Evaluation & Question Review Queue
- For subjective questions or fill-in-the-blank responses with minor spelling variations, faculty can inspect candidate answers in the **Review Queue** and manually award or deduct marks.

---

### G. Results Publication Control
- Results remain hidden from students while the test window is active to maintain integrity.
- Once the exam deadline passes, faculty click **"Publish"** on the All Exams management table.
- Students can now view their scores, detailed solutions, and class performance.

---

### H. Deep Exam Analytics & Class Leaderboard
Clicking on any exam's analytics opens a rich reporting suite:

```
+-------------------------------------------------------------------------------+
|  EXAM ANALYTICS: Mid-Semester Data Structures                                 |
|  Total Students: 184 | Class Average: 68.4% | Highest Score: 98/100           |
+-------------------------------------------------------------------------------+
|  Grade Distribution: [A: 42] [B: 88] [C: 38] [D: 16]                          |
|                                                                               |
|  Filters: [Branch: CSE] [Year: Year 3] [Domain: AI/ML] [Integrity: Clean]     |
+-------------------------------------------------------------------------------+
|  LEADERBOARD                                                                  |
|  #1  N210782  Rahul Sharma     98/100 (98%)   0 Violations   [Inspect Sheet]  |
|  #2  N210814  Priya Reddy      95/100 (95%)   0 Violations   [Inspect Sheet]  |
|  #3  N210450  K. Sai Kumar     91/100 (91%)   1 Violation    [Inspect Sheet]  |
+-------------------------------------------------------------------------------+
|  [Download PDF Report]                       [Export Excel Spreadsheet]       |
+-------------------------------------------------------------------------------+
```

1. **Class Overview KPIs**: Total attempts, class average score, top score, and grade distribution charts (A, B, C, D buckets).
2. **Dynamic Cohort Filtering**:
   - **Branch Filter**: Dynamically shows only the branches eligible for that specific exam.
   - **Year Filter**: Filter by academic year.
   - **Domain Filter**: Filter by specialization domains.
   - **Integrity Filter**: Separate clean test takers from candidates with proctoring violations.
   - **Search Bar**: Instant search by student name, roll number, or email.
3. **Deep Student Inspection Modal**:
   - Clicking on any student reveals their full answer sheet: question text, student’s selected answer, official key, marks awarded, and time spent.
   - **Violation Evidence Gallery**: View timestamped logs of every infraction along with **captured camera snapshot evidence** (e.g. photo of mobile phone detected). Faculty can click any image to enlarge and inspect.
4. **One-Click Exporting**:
   - **PDF Report**: Generates formatted, printable ranking tables.
   - **Excel Spreadsheet (.xlsx)**: Downloads complete spreadsheets for grading archives.

---

### I. Student Profile & Historical Domain Analytics (Admin View)
Faculty can search any student in the **Students Directory** to open their permanent portfolio:
- **Academic Summary**: Roll number, branch, year, CGPA, account status (Active / Alumni), and assigned domains.
- **Domain-Specific Performance**: Displays average score and pass rate broken down **strictly by the domains that student selected** (e.g. *Web Development: 84%*, *AI/ML: 72%*).
- **All Past Submissions**: Full list of every exam taken with scores, dates, and direct links to inspect answer sheets.

---

### J. Campus Toppers & Recruitment Discovery
A dedicated **Toppers & Leaderboard** portal ranks candidates college-wide:
- Filter the top students by **Branch**, **Year**, and **Domain** (e.g., *Find the top 10 CSE 3rd Year students in Cybersecurity*).
- Ranking algorithm prioritizes:
  1. Highest Average Percentage
  2. Number of Completed Exams
  3. Clean Proctoring Integrity (fewer violations)
- Ideal for campus placement coordinators to generate shortlist rosters for visiting companies.

---

## 🛡️ 4. Security & Fairness Summary

| Security Measure | How It Works | Why It Matters |
| :--- | :--- | :--- |
| **Browser AI Proctoring** | Runs inside the browser without installing bulky third-party software. | Fast, privacy-safe, works on standard student laptops and lab PCs. |
| **Mobile Device Detection** | Vision model scans the webcam feed to detect unauthorized phones. | Stops students from looking up answers on external screens. |
| **Tab / Screen Guard** | Tracks when the student switches windows or minimizes fullscreen. | Prevents googling answers or opening chat applications. |
| **Screen Watermark** | Overlays Name & Roll No across the questions and options. | Stops camera photography and question leaking on social channels. |
| **Randomized Ordering** | Questions and answer options can be shuffled per student. | Prevents side-by-side copying in computer labs. |
| **Isolated Section Timers**| Forces strict time limits per topic section with no backward jumping. | Standardizes testing formats matching GATE, CAT, and corporate exams. |

---

## 📊 5. Feature Comparison Checklist

| Feature | Student Portal | Admin / Faculty Portal |
| :--- | :---: | :---: |
| **Personalized Dashboard** | ✅ | ✅ |
| **Single & Multi-Section Timers** | ✅ | ✅ (Configurable) |
| **MCQ, MSQ & Fill in Blanks** | ✅ | ✅ (Authoring & Bank) |
| **Real-Time Auto Saving** | ✅ | — |
| **Live AI Camera Proctoring** | ✅ (Monitored) | ✅ (Live Monitoring Cockpit) |
| **Screen Watermark Protection** | ✅ | — |
| **Automated Strike Lockout** | ✅ | ✅ (Remote Unlock Control) |
| **Email Broadcast Notifications** | — | ✅ (With Live Streaming Count) |
| **Result Publication Control** | — | ✅ (Publish / Unpublish) |
| **Deep Leaderboards & Cohort Filters** | ✅ (Rankings) | ✅ (Advanced Filters & Logs) |
| **Snapshot Evidence Inspection** | — | ✅ (High-Res Modal) |
| **PDF & Excel Reports** | — | ✅ |
| **Domain-Wise Performance Analytics** | ✅ | ✅ (Specialized Shortlisting) |
| **Topper Roster Generation** | — | ✅ (Placement Cell Tool) |

---

## 🎯 6. Summary for Non-Technical Stakeholders

The **RGUKT Online Examination Portal** combines the ease of a modern web application with the rigorous security of high-stakes testing platforms (such as TCS iON and Mercer Mettl). 

- **For Students**: It offers a crystal-clear, distraction-free environment that rewards authentic learning.
- **For Faculty**: It eliminates manual paper grading, automates email communication, prevents malpractice, and provides instant analytics.
- **For the Institution**: It establishes a standardized, automated, and tamper-proof evaluation ecosystem that empowers placements, streamlines semester exams, and elevates academic transparency.
