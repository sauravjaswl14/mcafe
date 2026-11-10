import { useSyncExternalStore } from 'react';

/** Tiny global flag: flips to true once the preloader curtain starts opening. */
let done = false;
const subs = new Set<() => void>();

export const getIntroDone = () => done;

export function setIntroDone() {
  if (done) return;
  done = true;
  subs.forEach((s) => s());
}

export const useIntroDone = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => done,
    () => false,
  );
