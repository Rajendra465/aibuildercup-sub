import { GenerationJob } from "../types";
import { mirrorJob } from "../store/firestore-sync";

// Jobs live in memory per instance; every change is mirrored to Firestore for durable history.
const jobStore: Map<string, GenerationJob> = new Map();

export const GenerationQueue = {
  enqueue: async (job: GenerationJob): Promise<void> => {
    jobStore.set(job.id, job);
    mirrorJob(job);
  },

  getJob: async (jobId: string): Promise<GenerationJob | null> => {
    return jobStore.get(jobId) || null;
  },

  getAllJobs: async (): Promise<GenerationJob[]> => {
    return Array.from(jobStore.values());
  },

  updateJob: async (jobId: string, updates: Partial<GenerationJob>): Promise<GenerationJob | null> => {
    const job = jobStore.get(jobId);
    if (!job) return null;

    const updatedJob = { ...job, ...updates };
    jobStore.set(jobId, updatedJob);
    mirrorJob(updatedJob);
    return updatedJob;
  },

  clear: async (): Promise<void> => {
    jobStore.clear();
  }
};
