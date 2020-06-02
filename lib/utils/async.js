/**
 * Run a list of functions in sequence. The next function will
 * be called only when the current one finishes its execution.
 *
 * Example:
 *
 * ````
 * const sequenceQueue = [fn1, fn2, fn3];
 *
 * runInSequence(sequenceQueue)
 *   .then(function(lastPromiseValue) { console.log('Done!', lastPromiseValue) })
 *   .catch(function(err) { console.log('Ouch...', err) });
 * ````
 *
 * @param {Array} callableList The array containing the functions to be executed. Each function in the array must return a Promise.
 * @returns a Promise that resolves when all the promises in the chain are resolved.
 */
function runInSequence(callableList) {
  const promiseValues = [];
  let promiseChain = Promise.resolve();

  for (let i = 0; i < callableList.length; i++) {
    (function (idx) {
      promiseChain = promiseChain.then((lastPromiseVal) => {
        if (idx > 0) {
          promiseValues.push(lastPromiseVal);
        }

        return callableList[idx]();
      });
    })(i);
  }

  promiseChain = promiseChain.then((lastPromiseVal) => {
    promiseValues.push(lastPromiseVal);
    return Promise.resolve(promiseValues);
  });

  return promiseChain;
}

/**
 * Run a list of functions in parallel. The main difference for the `Promise.all`
 * is it allows you to limit the number of parallel executions at a time.
 *
 * Example:
 *
 * ````
 * const parallelQueue = [fn1, fn2, fn3];
 *
 * runInParallel(parallelQueue)
 *   .then(function(arrayOfPromiseValues) { console.log('Done!', arrayOfPromiseValues) })
 *   .catch(function(err) { console.log('Ouch...', err) });
 * ````
 *
 * Limiting the parallel execution to run only 2 items in parallel:
 *
 * ````
 * const parallelQueue = [fn1, fn2, fn3];
 *
 * runInParallel(parallelQueue, { limit: 2 })
 *   .then(function(arrayOfPromiseValues) { console.log('Done!', arrayOfPromiseValues) })
 *   .catch(function(err) { console.log('Ouch...', err) });
 * ````
 *
 * @param {Array} callableList The array containing the functions to be executed. Each function in the array must return a Promise.
 * @param {Object} options The available options are:
 * - **limit:** Limits the parallel execution at *n* times, (e.g. let's say you send a list of 100 functions.
 * Passing this value as `5` will make the execution to be limited at 5 parallel functions at a time).
 * @returns a Promise that resolves when all the promises in the chain are resolved.
 */
function runInParallel(callableList, options) {
  if (options && options.limit > 0) {
    const executionQueue = [];

    for (let offset = 0; offset < callableList.length; offset += options.limit) {
      (function (o, l) {
        executionQueue.push(() => runInParallel(callableList.slice(o, o + l)));
      })(offset, options.limit);
    }

    let promiseChain = runInSequence(executionQueue);
    promiseChain = promiseChain.then((allVals) => Promise.resolve(allVals.flat(executionQueue.length)));

    return promiseChain;
  } else {
    return Promise.all(callableList.map((callable) => callable()));
  }
}

module.exports = {
  runInSequence,
  runInParallel,
};
