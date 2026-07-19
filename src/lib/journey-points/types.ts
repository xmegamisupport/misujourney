/** One award, as returned by refresh_journey_rewards(). The label and emoji
 * come from the database (journey_point_values), not from the client — so
 * re-tuning or renaming a reward is a single UPDATE, with no deploy. */
export interface JourneyPointAward {
  action: string;
  points: number;
  label: string;
  emoji: string;
}

export interface JourneyPointBalance {
  total: number;
  today: number;
}
