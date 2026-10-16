/** Request-time clock for Server Components (each render is one request, after `connection()`). */
export const requestNow = () => Date.now();
