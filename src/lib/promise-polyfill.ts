// Polyfill for Promise.withResolvers required by pdfjs-dist v4+
if (typeof Promise.withResolvers === "undefined") {
  // polyfilling Promise.withResolvers
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
