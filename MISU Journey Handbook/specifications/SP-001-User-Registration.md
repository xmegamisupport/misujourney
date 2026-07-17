\# SP-001 User Registration



Version: v1.0



Status: Draft



\---



\# Overview



The User Registration module is the foundation of MISU Journey.



Every customer must complete registration before accessing any journey features.



The purpose of registration is to collect the minimum required information for the system to personalise the customer's health journey, calculate suitable targets and connect the customer with the assigned Coach.



All future modules will retrieve customer information from this module.



\---



\# Objective



The registration process should:



\- Be simple

\- Take less than 5 minutes

\- Avoid unnecessary questions

\- Collect only meaningful information

\- Personalise the journey automatically



\---



\# User Flow



Customer Registration



↓



Create Account



↓



Complete Basic Information



↓



Select Journey Duration



↓



Assign Coach



↓



Register Purchased MISU Products



↓



Generate Personal Targets



↓



Complete Registration



↓



Enter Dashboard



\---



\# Registration Information



The customer should complete the following information.



\## Basic Information



\- Full Name

\- Nickname (Optional)

\- Gender

\- Date of Birth

\- Age (Auto calculated)

\- Height (cm)

\- Current Weight (kg)

\- Target Weight (kg)



\---



\## Lifestyle



\- Exercise Frequency

&#x20;   - Never

&#x20;   - 1–2 days/week

&#x20;   - 3–5 days/week

&#x20;   - 6–7 days/week



\---



\## Journey



Customer selects:



\- 60 Days Journey

or

\- 90 Days Journey



\---



\## Coach



Every customer must be linked to one Coach.



Coach information includes:



\- Coach Name

\- Coach WhatsApp Link



(The customer does not manually choose the Coach. The system assigns according to registration.)



\---



\## Purchased Products



Customer registers purchased products.



MISU N+



\- Number of Boxes



MISU DX+



\- Number of Boxes



System automatically converts:



1 Box = 20 Sachets



Inventory will be used throughout the Journey.



\---



\# System Calculations



After registration, the system automatically generates:



\## Daily Water Goal



Formula



Current Weight × 40 ml



Example



60 kg



↓



2400 ml/day



\---



\## Daily Nutrition Goal



Phase 1



Use predefined values according to customer profile.



Future version



Automatically calculate using:



\- Height

\- Weight

\- Age

\- Gender

\- Activity Level

\- Goal



\---



\## Body Progress Schedule



Generate automatic reminders.



Day 0



Required



Day 14



Day 28



Day 42



...



until Journey completes.



\---



\# Validation Rules



Registration cannot be completed if:



\- Required fields are empty.

\- Height is invalid.

\- Weight is invalid.

\- Journey Duration not selected.

\- Purchased Product quantity missing.



\---



\# After Registration



The system automatically creates:



Customer Profile



Journey Progress



Nutrition Goal



Water Goal



Inventory



Body Progress Timeline



Coach Assignment



Learning Progress



Dashboard



\---



\# Future Expansion



The registration module should support future additions without rebuilding database structure.



Future fields may include:



\- Medical Conditions

\- Allergies

\- Pregnancy

\- Vegetarian Preference

\- Language Preference

\- Country

\- Timezone



\---



\# Out of Scope (Phase 1)



The following are NOT included:



\- Referral System

\- Promo Code

\- Payment

\- Medical Assessment

\- AI Consultation



These will be developed in future phases.



\---



\# Acceptance Criteria



Registration is considered successful when:



✓ Customer profile created.



✓ Journey generated.



✓ Dashboard available.



✓ Water goal calculated.



✓ Nutrition goal generated.



✓ Inventory created.



✓ Coach assigned.



✓ Body Progress schedule created.



✓ Customer enters Dashboard successfully.

