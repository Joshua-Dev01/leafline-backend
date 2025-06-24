// src/services/auth/utils/catchAsync.ts
const catchAsync = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;
