import type { PopularWeights } from './feed-types';

export interface WeightStore {
  read(): Promise<PopularWeights>;
  save(weights: PopularWeights): Promise<void>;
}
