# mergeRequestReview

A human reviews the run's merge request before it ships. Review is run-level
delivery config (`delivery: mergeRequest()`), not a node gate — every run
ends in exactly one MR, and merging it is the workflow's exit criterion.

* The engine opens the MR after the last node's gates pass
* The run resolves when the MR is merged (approved) or closed (rejected)
