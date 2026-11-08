export async function runOrderingDemo(): Promise<readonly string[]> {
  const order: string[] = [];

  order.push('sync');
  process.nextTick(() => order.push('nextTick'));
  queueMicrotask(() => order.push('microtask'));
  void Promise.resolve().then(() => order.push('promise'));

  await Promise.resolve();
  order.push('after-microtasks');

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  order.push('after-timer');

  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  order.push('after-immediate');

  return order;
}
