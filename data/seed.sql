INSERT INTO support_triage.cases
  (scholar, summary, channel, category, urgency, status, owner, next_step, created_date, last_touch, due_date)
VALUES
  (
    'Avery Hill',
    'Tuition payment gap for spring term',
    'Email',
    'Financial aid',
    'High',
    'Open',
    'Maya',
    'Confirm balance and send payment plan options',
    current_date - interval '6 days',
    current_date - interval '4 days',
    current_date + interval '2 days'
  ),
  (
    'Luis Carter',
    'Housing insecurity update from advisor',
    'Phone',
    'Wellbeing',
    'Critical',
    'Open',
    'Jordan',
    'Escalate to care partner and document resources',
    current_date - interval '2 days',
    current_date - interval '1 day',
    current_date + interval '1 day'
  ),
  (
    'Renee Brooks',
    'Laptop repair request stalled',
    'Form',
    'Technology access',
    'Medium',
    'Pending',
    null,
    'Assign owner and confirm loaner availability',
    current_date - interval '12 days',
    current_date - interval '8 days',
    current_date - interval '1 day'
  ),
  (
    'Sami Patel',
    'Missed tutoring sessions, check-in needed',
    'Slack',
    'Academic support',
    'Low',
    'Open',
    'Nia',
    'Schedule reset call and confirm attendance plan',
    current_date - interval '14 days',
    current_date - interval '10 days',
    current_date + interval '4 days'
  ),
  (
    'Kayla Nguyen',
    'Transportation stipend delay',
    'Email',
    'Program operations',
    'Medium',
    'Open',
    'Emil',
    'Verify payout date and update scholar',
    current_date - interval '5 days',
    current_date - interval '3 days',
    current_date + interval '3 days'
  ),
  (
    'Darius Webb',
    'FAFSA correction support needed',
    'Phone',
    'Financial aid',
    'High',
    'Pending',
    'Riley',
    'Schedule 1:1 FAFSA correction walkthrough',
    current_date - interval '9 days',
    current_date - interval '6 days',
    current_date + interval '1 day'
  );
