ALTER TABLE submissions
  ADD COLUMN edit_unlocked boolean NOT NULL DEFAULT false;

ALTER TABLE submissions

ADD COLUMN edit_unlocked_by UUID NULL;

ALTER TABLE submissions

ADD COLUMN edit_unlocked_at TIMESTAMP NULL;