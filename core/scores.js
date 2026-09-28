// Where the arcade's shared high-score boards live: the arcade-scores app on the flask-stack,
// reached through Tailscale Funnel. The games post to it and the arcade page reads from it.
// No trailing slash: requests add "/api/scores/<game>".
export const SCORES_API = "https://keyandcable-pi.tailaeddec.ts.net";
