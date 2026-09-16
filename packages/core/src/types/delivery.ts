export interface MergeRequestDelivery {
  readonly kind: 'mergeRequest';
  /** Require human approval of the run's merge request. Defaults to true. */
  readonly review: boolean;
}

export type Delivery = MergeRequestDelivery;
