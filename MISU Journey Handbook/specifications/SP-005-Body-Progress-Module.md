# SP-005 | Body Progress Module

Status:
Draft

Version:
1.0

Owner:
XMEGAMI Product Team

Priority:
High

Phase:
Phase 1 MVP

---

# 1. Module Overview

## Purpose

Body Progress is designed to help customers visually record their body transformation throughout their MISU Journey.

The objective is not to evaluate appearance or weight loss.

Instead, it provides a structured way for customers to build confidence, recognise consistency, and preserve meaningful milestones during their health journey.

This module also allows Coaches to better understand each customer's progress and provide more personalised encouragement based on both behavioural data and body progress records.

---

## Module Objectives

The Body Progress Module has five core objectives:

1. Record the customer's body transformation throughout the Journey.

2. Encourage long-term consistency through regular progress recording.

3. Help customers stay motivated by building a visual timeline of their journey.

4. Provide Coaches with meaningful progress records to support personalised coaching.

5. Create a secure and private photo archive while separating marketing authorisation from personal records.

---

## Success Criteria

This module is considered successful when:

- Customers willingly complete their first Body Progress record.

- Customers continue recording every 14 days.

- Coaches can easily review customer progress.

- Customers feel encouraged rather than judged.

- Progress photos remain private and secure.

- Marketing usage always requires separate customer authorisation.

# 2. Business Goals & Module Scope

## Business Goals

The Body Progress Module is designed to achieve the following business goals:

### Customer

- Increase motivation through visual progress tracking.
- Build long-term healthy habits instead of focusing only on weight.
- Improve confidence by preserving meaningful milestones.

### Coach

- Reduce manual follow-up for body progress collection.
- Provide sufficient information for personalised encouragement.
- Help Coaches understand both customer behaviour and physical progress.

### Company

- Standardise body progress records across all customers.
- Improve operational efficiency by reducing manual photo collection.
- Build a structured body progress archive for customer progress tracking. Marketing usage is managed through a separate Media Authorisation workflow.
- Ensure all customer photos remain private unless separate marketing permission is granted.

---

## Module Scope (Phase 1 MVP)

This module includes:

- Initial Body Progress setup.
- Four-angle photo submission.
- Body Progress timeline.
- 14-day recording cycle.
- Dashboard reminders.
- Coach viewing interface.
- Admin viewing permission.
- Privacy protection.
- Marketing authorisation separated from Body Progress.

---

## Out of Scope (Phase 1)

The following features are intentionally excluded from this phase:

- AI body shape analysis.
- AI comparison of before and after photos.
- Automatic body measurement detection.
- Public Success Gallery.
- Community sharing.
- Journey Star rewards.
- Journey Point rewards.
- Body fat estimation from photos.

These features may be introduced in future phases after the MVP has been validated.

# 3. Customer Journey Flow

## 3.1 First Time Setup

After completing registration, customers will see a new onboarding task:

**Build Your Starting Point**

Customers are encouraged to complete their first Body Progress record as early as possible.

However, Body Progress is NOT mandatory before starting the Journey.

Customers may choose:

- Start Now
- Do It Later

Selecting "Do It Later" will NOT block access to other Journey features.

---

## 3.2 Reminder Logic

If the customer postpones the first recording:

Day 1
Dashboard displays a reminder card encouraging the customer to complete the Body Progress.

Day 2
The same reminder remains visible.

Day 3
The reminder remains visible.

Coach Dashboard will also recommend this customer in Today's Focus.

After Day 3

Customers may still submit their first Body Progress at any time.

The system continues reminding the customer through the Dashboard until the first record is completed.

The Journey remains fully accessible.

---

## 3.3 First Body Progress Submission

The first submission requires four photos:

- Front View
- Left Side View
- Right Side View
- Back View

Customers will be provided with a photo guideline before taking their first Body Progress record.

To ensure consistent progress comparison, customers are encouraged to wear fitted clothing that clearly shows their body shape.

Recommended attire includes:

- Sports Bra
- Sports Top
- Sports Leggings
- Fitted T-shirt
- Fitted Shorts
- Any comfortable fitted clothing

Loose or oversized clothing is discouraged, as it may reduce the accuracy of future visual comparisons.

The goal is not to judge body shape, but to maintain consistent photo conditions throughout the Journey.

Customers are encouraged to wear similar clothing for future Body Progress records whenever possible.

Maintaining similar clothing, posture and camera angle helps create a more meaningful visual comparison over time.
---

## 3.4 Submission Rules

Customers may retake photos before pressing **Submit**.

After submission:

- Photos become permanent records.
- Previous history cannot be edited.
- Previous history cannot be deleted.

Only the current unfinished submission may be replaced.

---

## 3.5 Completion Experience

After successful submission:

The system immediately celebrates the customer's consistency.

The system congratulates the customer for completing the milestone.

The system DOES NOT evaluate body changes.

Customers will then see:

- Growth Timeline
- Next scheduled recording (14 days later)
- Continue Today's Journey

---

## 3.6 Ongoing Recording Cycle

During Phase 1 MVP:

Customers are invited to record Body Progress every 14 days.

The Dashboard will automatically display a reminder when the next Body Progress record is due.

Customers may complete the recording immediately or postpone it.

The reminder remains until the current Body Progress task is completed.

After completing a Journey (60 or 90 days), customers are presented with a Journey Completion screen. They may choose to start a new Journey (60 or 90 days) or enter Lifestyle Mode. All Body Progress history is preserved across multiple Journey phases.

# 4. Coach Experience

## Purpose

The Coach Experience is designed to help Coaches provide meaningful support while minimising manual follow-up and administrative workload.

The system should guide Coaches towards customers who need attention instead of requiring Coaches to monitor every customer manually.

---

## Today's Focus

When a customer's Body Progress requires attention, the system may recommend that customer within the Coach Dashboard.

Examples include:

- First Body Progress overdue (Day 3 onwards)
- 14-day Body Progress reminder overdue
- New Body Progress submitted
- Important progress milestone completed

The system prioritises customers based on urgency and importance.

---

## Coach Information

Before contacting a customer, Coaches should be able to quickly view:

- Current Journey Plan
- Current Journey Day
- Latest Body Progress photos
- Previous Body Progress history
- Weight trend
- Check-in consistency
- Learning completion
- Product inventory status (if applicable)

The objective is to give Coaches enough context to provide personalised encouragement instead of generic follow-up.

---

## Coach Next Action

After reviewing or contacting a customer, the Coach selects the next action.

Available actions:

- Continue Support
- Remind Again in 7 Days
- Remind Again in 30 Days
- Pause Follow-up
- Task Completed

This action determines future reminder behaviour.

The system should minimise repetitive manual work while allowing Coaches to remain in control.

---

## Design Principle

The Coach Dashboard is designed to manage support, not manage customers.

The objective is to help Coaches spend their limited time on the customers who need support the most.

# 5. Coach Interface & Customer Progress View

## Purpose

The Coach Interface is designed to help Coaches understand a customer's overall progress within seconds.

Instead of reviewing large amounts of data, Coaches should immediately understand the customer's journey, consistency and progress before providing encouragement.

---

## Default View

When opening a customer's Body Progress page, the Coach will first see:

### Left Panel

Baseline Body Progress

(Customer's first Body Progress record)

### Right Panel

Latest Body Progress

(Customer's most recent completed Body Progress record)

This provides the clearest visual comparison of the customer's overall journey.

---

## Journey Summary

Displayed beside the comparison photos:

- Current Journey Plan
- Current Journey Day
- Current Weight
- Total Weight Change
- Consecutive Check-in Days
- Total Body Progress Records
- Check-in Completion Rate
- Learning Completion Rate
- Coach Next Action

The objective is to give Coaches enough context to provide personalised encouragement.

---

## Timeline View

Selecting "View Timeline" displays every Body Progress record in chronological order.

Example:

Day 0

↓

Day 14

↓

Day 28

↓

Day 42

↓

Latest

Each record includes:

- Four progress photos
- Submission date
- Journey Day
- Weight on submission day

---

## Design Principle

The default interface should answer one question:

"How far has this customer come since the beginning?"

Detailed progress history is always available through Timeline View when deeper review is required.

# 6. My Growth Journey (Customer Experience)

## Purpose

My Growth Journey is designed to help customers look back on their progress with confidence and encouragement.

The purpose is not to evaluate results, but to preserve meaningful milestones throughout the customer's health journey.

Every completed record becomes part of the customer's personal story.

---

## Journey Homepage

Customers enter their personal growth timeline through:

My Growth Journey

A short message is displayed at the top:

"Every small step matters.
Thank you for choosing to keep going."

---

## Timeline Structure

Each Body Progress record is displayed as a milestone card in chronological order.

Each milestone includes:

- Journey Day
- Submission Date
- Four Progress Photos
- Weight on submission day (if available)
- Journey Plan
- Achievement Highlights
- Encouragement Message

---

## Achievement Highlights

The system may display completed achievements such as:

- Completed Body Progress
- Consecutive Check-in Days
- Learning Completion
- Water Goal Achievement
- Nutrition Goal Achievement

Only achievements that have actually been completed are displayed.

---

## Encouragement Principle

The system celebrates consistency.

The system does NOT evaluate:

- Body shape
- Weight loss quality
- Appearance
- Visual changes

Examples:

✓ Thank you for completing another milestone.

✓ You have continued investing in your health.

✓ Every record is another step forward.

The wording should always encourage continued participation instead of judging progress.

---

## Compare Function

Customers may compare:

- First Body Progress vs Latest Body Progress (Default)

Optional comparisons:

- First vs Any Milestone
- Any Milestone vs Latest

This comparison is initiated by the customer.

The system does not automatically analyse or comment on photo differences.

---

## Design Principle

When customers revisit My Growth Journey, they should feel:

"I've come a long way."

rather than

"I'm not good enough yet."

The experience should strengthen confidence, reinforce healthy habits and encourage customers to continue their Journey.

# 7. Data Model

## Purpose

This chapter defines the information that belongs to a Body Progress record.

It does not define database tables or implementation details.

The purpose is to ensure that all future development follows a consistent data structure.

---

## Body Progress Record

Each completed Body Progress record contains:

### Basic Information

- Body Progress ID
- Customer ID
- Journey ID
- Journey Plan ID
- Journey Day
- Submission Date & Time

---

### Progress Information

Each Body Progress record stores a Weight Snapshot.

Weight Snapshot does not require the customer to take or upload a photo of the weighing scale.

The system automatically retrieves the customer's most recent valid Morning Check-in weight when the Body Progress record is submitted.

Priority:

1. Use the completed Morning Check-in weight from the same local date.
2. If no weight was recorded on the same date, use the most recent available Morning Check-in weight.
3. Store the original weight record date together with the snapshot.
4. If no previous weight record exists, Weight Snapshot remains empty.
5. Missing Weight Snapshot must not prevent Body Progress submission.

The Body Progress flow must not ask customers to enter their weight again.

The existing Morning Check-in remains the single source of truth for customer weight records.

The snapshot should store:

- Weight Value
- Weight Unit
- Source Weight Record ID
- Source Weight Record Date
- Snapshot Created At

Phase 1 does not require:

Phase 1 stores only:

- Weight Snapshot (kg)

Weight Snapshot is the only health metric stored in Phase 1.

Future versions may expand the Health Snapshot to include:

- Body Fat %
- Muscle Mass
- Visceral Fat
- Other body composition metrics

BMI is intentionally excluded because it is not the primary indicator of body composition.

Phase 1 does not require:

- Weighing scale photo upload
- AI weight recognition

# 8. Storage Design

## Purpose

This chapter defines how Body Progress photos are stored throughout their lifecycle.

The storage strategy balances:

- Customer experience
- Long-term scalability
- Marketing requirements
- Storage cost
- Data security

---

## Storage Structure

Each customer has an independent Body Progress archive.

Each completed submission creates one permanent Body Progress record.

Each record contains:

- Front View
- Left View
- Right View
- Back View

Each submission is independent and cannot overwrite previous records.

---

## Image Versions

Phase 1 stores two image versions.

### Original Image

Purpose:

- Preserve original quality
- Future marketing review
- Customer archive

Original Images are temporary assets.

They follow the Image Lifecycle Policy.

---

### Preview Image

Purpose:

- Customer Timeline
- Coach Dashboard
- App Display

Preview Images are permanently retained.

---

## Image Lifecycle

Original Images are not permanently retained.

Original Images may be removed only when ALL conditions are met:

- Journey has ended.
- Original image retention period has expired.
- Marketing has not marked the record for retention.
- Media Authorization has not been approved.
- Archive Review has been completed.

If any condition is not met, the Original Image remains.

Preview Images are never removed.

---

## Image Review

The system should provide an Archive Review Queue.

Marketing or authorised staff may review completed Journey records and decide whether to retain Original Images.

The review process should be simple and efficient.

---

## Storage Principles

Customers should never notice the storage strategy.

The storage system operates automatically without requiring customer action.

Body Progress should always feel simple, while the platform manages storage efficiently in the background.

# 9. Photo Capture Experience

## Purpose

The Photo Capture Experience is designed to help customers take consistent Body Progress photos throughout their Journey.

The objective is not professional photography.

The objective is to produce consistent progress records that can be meaningfully compared over time.

---

## Photo Guide

Before taking the first Body Progress record, customers will receive a simple photo guide.

The guide explains:

- Wear fitted clothing whenever possible.
- Stand in a bright environment.
- Remove jackets or oversized clothing.
- Keep the camera at approximately waist level.
- Maintain a natural standing posture.

---

## Camera Overlay

The camera displays a body guide overlay.

Customers are encouraged to position themselves inside the guide before taking each photo.

The overlay helps maintain:

- Consistent body size
- Consistent framing
- Consistent comparison across future records

The system focuses on body composition within the frame rather than shooting distance.

---

## Composition Principle

The customer's entire body should remain visible.

Recommended composition:

- Head fully visible
- Feet fully visible
- Arms naturally beside the body
- Body centred within the overlay

The exact shooting distance is not fixed.

The goal is consistent body proportion inside the frame.

---

## Capture Progress

Customers complete four photos in sequence:

① Front

② Left

③ Right

④ Back

A progress indicator shows which views have been completed.

Customers may retake any photo before submitting.

---

## Guidance Messages

If the body appears too close or too far from the guide, the system provides a friendly suggestion.

Examples:

"Try moving a little closer so your body fills the guide."

or

"Try stepping back slightly so your full body fits inside the guide."

These suggestions do not prevent submission.

Customers may continue if they are satisfied with the photo.

---

## Design Principle

The system guides customers instead of enforcing perfect photography.

Consistency is more important than perfection.

Reducing friction increases long-term participation.
