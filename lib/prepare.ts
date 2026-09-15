import type { AssessmentStage, Program } from '@/types';

/**
 * "What to prepare" is derived from the stage types a programme lists, not
 * written per employer. That keeps it honest: we know the shape of an
 * assessment centre in general, we do not know what this employer runs.
 */

export const STAGE_LABEL: Record<AssessmentStage, string> = {
  online_application: 'Online application',
  aptitude_test: 'Aptitude test',
  video_interview: 'Recorded video interview',
  technical_test: 'Technical test',
  assessment_centre: 'Assessment centre',
  panel_interview: 'Panel interview',
  final_interview: 'Final interview',
};

/** A compact label for the timeline, where horizontal room is tight. */
export const STAGE_SHORT_LABEL: Record<AssessmentStage, string> = {
  online_application: 'Apply',
  aptitude_test: 'Aptitude',
  video_interview: 'Video',
  technical_test: 'Technical',
  assessment_centre: 'Centre',
  panel_interview: 'Panel',
  final_interview: 'Final',
};

export interface PrepareItem {
  /** Kept stable so React keys and the harness can both rely on it. */
  id: string;
  text: string;
  /** Which stage put this on the list, for the "because you'll hit X" line. */
  from: AssessmentStage;
}

const STAGE_PREPARATION: Record<AssessmentStage, string[]> = {
  online_application: [
    'Have your transcript, CGPA and graduation date to hand — most forms ask for all three and time out if you go hunting.',
    'Write your "why this employer" answer once, in your own words, and keep it somewhere you can adapt it. You will be asked some version of it every time.',
  ],
  aptitude_test: [
    'Practise timed numerical and logical reasoning. The difficulty is usually moderate; the time limit is the hard part.',
    'Sit it somewhere quiet on a stable connection. Most of these cannot be paused or restarted.',
  ],
  video_interview: [
    'Record yourself answering two or three standard questions and watch it back. It is uncomfortable and it is the fastest way to improve.',
    'Check your camera framing, lighting and background before the day, not on it.',
  ],
  technical_test: [
    'Revise the fundamentals of your own field rather than trying to cover everything. These tests go deep on a narrow area.',
    'Work through a few problems on paper first. Several employers still assess reasoning rather than a finished answer.',
  ],
  assessment_centre: [
    'Expect a group exercise. Contributing once clearly beats talking constantly — assessors are watching how you make room for others.',
    'Read any pre-read material properly. Candidates who skim it are visible within five minutes.',
    'Bring a printed copy of your CV and your identification.',
  ],
  panel_interview: [
    'Prepare three specific examples from your own experience that you can reshape to fit most questions.',
    'Find out who is on the panel if the invite names them. Asking one informed question at the end lands well.',
  ],
  final_interview: [
    'Be ready to talk about salary expectations, your start date and any other offers. This stage usually covers all three.',
    'Have one real question about the role that you could not have answered from the website.',
  ],
};

/**
 * Build the prepare list for a programme. Stages are visited in order and each
 * item appears once, so a programme with two interview rounds does not repeat
 * the same advice twice.
 */
export function preparationFor(program: Program): PrepareItem[] {
  const seen = new Set<string>();
  const items: PrepareItem[] = [];

  program.stages.forEach(({ stage }) => {
    (STAGE_PREPARATION[stage] ?? []).forEach((text, index) => {
      if (seen.has(text)) return;
      seen.add(text);
      items.push({ id: `${stage}-${index}`, text, from: stage });
    });
  });

  return items;
}

/** Rough reading of how demanding the process is, from stage count and length. */
export function processShape(program: Program): string {
  const stages = program.stages.length;
  const weeks = program.typicalProcessWeeks;
  const perStage = weeks / Math.max(stages, 1);

  if (stages >= 5 && weeks >= 12) {
    return `${stages} stages over roughly ${weeks} weeks. This is a long process — plan for it to run alongside your final semester.`;
  }
  if (perStage >= 3) {
    return `${stages} stages over roughly ${weeks} weeks, so expect quiet gaps of two to three weeks between them.`;
  }
  return `${stages} stages over roughly ${weeks} weeks, which moves quickly once it starts.`;
}
