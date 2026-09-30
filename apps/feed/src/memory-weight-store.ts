import { seed_weights, type PopularWeights } from './feed-types';
import type { WeightStore } from './weight-store';

export class MemoryWeightStore implements WeightStore {
  weights: PopularWeights = { ...seed_weights };

  async read(): Promise<PopularWeights> {
    return { ...this.weights };
  }

  async save(weights: PopularWeights): Promise<void> {
    this.weights = { ...weights };
  }
}
